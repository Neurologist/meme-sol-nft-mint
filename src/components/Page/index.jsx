import React, { useState, useEffect } from "react";
import styles from "./Page.module.sass";
import Navbar from "../Header/Navbar";
/* import Header from "../Header"; */
import cn from "classnames";

const Page = ({ children, handleVideoMuted }) => {
  const [navbar, setNavbar] = useState(false);

  useEffect(() => {
    const autoCloseNavbarDesktop = () => {
      if (navbar === true) {
        setNavbar(false);
        console.log("rasd");
      }
    };
    window.addEventListener("resize", autoCloseNavbarDesktop);
    return () => {
      window.removeEventListener("resize", autoCloseNavbarDesktop);
    };
  }, [navbar]);

  return (
    <div className={styles.page}>
      <Navbar navbar={navbar} setNavbar={(navbar) => setNavbar(navbar)} />
      <div className={cn(navbar && styles.hidden, styles.container)}>
        {/* <Header /> */}
        <div className={styles.inner}>{children}</div>{/* 
        <DripBig />
        <Footer /> */}
      </div>
    </div>
  );
};

export default Page;
