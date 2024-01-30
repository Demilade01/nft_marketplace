import React, { useState, useEffect } from 'react';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import axios from 'axios';
import { useStorageUpload } from '@thirdweb-dev/react';

import { MarketAddress, MarketAddressABI } from './constants';


const fetchContract = (signerOrProvider) => new ethers.Contract(MarketAddress, MarketAddressABI, signerOrProvider);

export const NFTContext = React.createContext();

export const NFTProvider = ({ children }) => {
    const nftCurrency = 'ETH';
    const [currentAccount, setCurrentAccount] = useState('');

    const checkIfWalletIsConnected = async () => {
        if(!window.ethereum) return alert('Please install Metamask');

        const accounts = await window.ethereum.request({ method: 'eth_accounts'});

        if(accounts.length) {
            setCurrentAccount(accounts[0]);
        }else {
            console.log('No accounts found.');
        }
    };

    useEffect(() => {
        checkIfWalletIsConnected();
    }, []);

    const connectWallet = async () => {
        if(!window.ethereum) return alert('Please install Metamask');

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts'});

        setCurrentAccount(accounts[0]);

        window.location.reload();
    };

    const { mutateAsync: upload } = useStorageUpload();

    const uploadToIpfs = async (data) => {
        let url = '';
        try {
          url = await upload({
            data,
            options: {
              uploadWithGatewayUrl: true,
              uploadWithoutDirectory: true,
            },
          });
        } catch (error) {
          console.error('Error uploading to IPFS.', error);
        }

        return url;
      };

      const createNFT = async (formInput, fileUrl, router) => {
        try {
          const { name, description, price } = formInput;
          if (!name || !description || !price || !router) return;

          const data = JSON.stringify({ name, description, image: fileUrl });
          const url = await uploadToIpfs([data]);
          await createSale(url[0], price);

          router.push('/');
        } catch (error) {
          console.error('Error creating NFT', error);
        }
      };

    const createSale = async (url, formInputPrice ) => {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();

        const price = ethers.utils.parseUnits(formInputPrice, 'ether');
        const contract = fetchContract(signer);
        const listingPrice = await contract.getListingPrice();

        const transaction = await contract.createToken(url, price, { value: listingPrice.toString() });

        await transaction.wait();
    };

    const fetchNFTs = async () => {
        const provider = new ethers.providers.JsonRpcProvider();
        const contract = fetchContract(provider );
        const data = await contract.fetchMarketItems();

        const items = await Promise.all(data.map(async ({ tokenId, seller, owner, price: unformattedPrice}) => {
            const tokenURI = await contract.tokenURI(tokenId);
            const { data : { image, name, description }} = await axios.get(tokenURI);
            const price = ethers.utils.formatUnits(unformattedPrice.toString(), 'ether');

            return {
                price,
                tokenId: tokenId.toNumber(),
                seller,
                owner,
                image,
                name,
                description,
                tokenURI,
            };
        }));

        return items ;
    };

    const fetchMyNFTsOrListedNFTs = async (type) => {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();

      const contract = fetchContract(signer);

      const data = type === 'fetchItemsListed'
        ? await contract.fetchItemsListed()
        : await contract.fetchMyNFTs();

        const items = await Promise.all(data.map(async ({ tokenId, seller, owner, price: unformattedPrice}) => {
          const tokenURI = await contract.tokenURI(tokenId);
          const { data : { image, name, description }} = await axios.get(tokenURI);
          const price = ethers.utils.formatUnits(unformattedPrice.toString(), 'ether');

          return {
              price,
              tokenId: tokenId.toNumber(),
              seller,
              owner,
              image,
              name,
              description,
              tokenURI,
          };
      }));

      return items;
    };

    const buyNFT = async (nft) => {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();

      const contract = fetchContract(signer);

      const price = ethers.utils.parseUnits(nft.price.toString(), 'ether');

      const transaction = await contract.createMarketSale(nft.tokenId, { value: price});

      await transaction.wait();
    }

    return (
        <NFTContext.Provider value={{ nftCurrency, connectWallet, currentAccount, uploadToIpfs, createNFT, fetchNFTs, fetchMyNFTsOrListedNFTs, buyNFT }}>
            {children}
        </NFTContext.Provider>
    );
};