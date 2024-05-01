import React from "react";

import styles from "./Footer.module.sass";

const Footer = () => {
  return (
    <div className={styles.footerContainer}>
      <footer className={styles.footer}>
        <div className={styles.picContainer}>
          <img
            src={"/assets/images/sol-agralabs.png"}
            alt="sol flowers logo"
            width={561}
            height={169}
            objectFit="contain"
            className={styles.footerLogo}
          ></img>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
