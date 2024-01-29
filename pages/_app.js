import Script from 'next/script';
import { ThemeProvider } from 'next-themes';
import { ThirdwebProvider, ChainId } from '@thirdweb-dev/react';

import { NFTProvider } from '../context/NFTContext';
import { Navbar, Footer } from "../components";
import '../styles/globals.css';

const activeChainId = ChainId.Hardhat;

const MyApp = ({ Component, pageProps }) => (
  <ThirdwebProvider desiredChainId={activeChainId} clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}>
    <NFTProvider>
      <ThemeProvider attribute="class">
        <div className="dark:bg-nft-dark bg-white min-h-screen">
            <Navbar />
            <div className='pt-65 '>
            <Component {...pageProps} />
            </div>
            <Footer />
        </div>
        <Script src="https://kit.fontawesome.com/9b2da8baae.js" crossorigin="anonymous"></Script>
      </ThemeProvider>
    </NFTProvider>
  </ThirdwebProvider>
);

export default MyApp;