import React from "react";
import { Logo } from "../Logo";
import Navlink from "../Navlink/Navlink";
import NavLinkMobile from "../Navlink/NavlinkMobile";
import cn from "classnames";
import styles from "./Navbar.module.sass";


const navLinks = [
  {
    name: "staking",
    path: "https://monkainft.com/stake",
    title: "STAKING",
    blank: false,
  },
  {
    name: 'roadmap',
    path: 'https://monkainft.com/roadmap',
    title: 'ROADMAP',
    mobile: true,
    blank: false,
  },
  {
    name: "raffle",
    path: "https://raffle.monkainft.com/raffle",
    title: "RAFFLE",
    blank: false,
  },
  {
    name: 'mintgen1',
    path: 'https://mint.monkainft.com',
    title: 'MINT GEN1',
    mobile: true,
    blank: false,
  },
];
export default function Navbar({ navbar, setNavbar }) {
  const handleNavbar = (e, navLink) => {
    e?.stopPropagation();
    if (navLink !== "#") {
      setNavbar(!navbar);
    }
  };

  return (
    <div className={cn(styles.navbarContainer)}>
      <div className={styles.navbar}>
        <div className={styles.logoContainer}>
          <div className={styles.logo} onClick={() => navbar && handleNavbar()}>
            <Logo />
          </div>
        </div>
        <div className={styles.itemsDesktop}>
          <ul className={styles.itemsListDesktop}>
            {navLinks.map((navLink) => {
                return (
                  <li
                    key={navLink.name}
                    className={navLink.mobile ? styles.mobile : styles.desktop}
                  >
                    <Navlink {...navLink} />
                  </li>
                );
              
            })}
          </ul>
        </div>
          <div className={styles.register}>
            <a href={navLinks.find(x => x.name === 'roadmap').path} rel="noreferrer">
              <button>Roadmap</button>
            </a>
            <a href={navLinks.find(x => x.name === 'mintgen1').path} rel="noreferrer">
              <button>Mint GEN1</button>
            </a>
          </div>
        <div className={styles.itemsMobile} onClick={() => handleNavbar()}>
          <div className={styles.hamburgerLines}>
            <span
              className={cn(
                styles.line,
                styles.line1,
                navbar && styles.checked
              )}
            ></span>
            <span
              className={cn(
                styles.line,
                styles.line2,
                navbar && styles.checked
              )}
            ></span>
            <span
              className={cn(
                styles.line,
                styles.line3,
                navbar && styles.checked
              )}
            ></span>
          </div>
        </div>
        <div className={cn(styles.hamburgerMenu, !navbar && styles.hidden)}>
          <ul
            className={cn(
              styles.navMobile,
              "flex",
              "absolute",
              "top-24",
              "right-0",
              "bottom-0",
              "w-full",
              "z-50",
              "flex-col",
              navbar ? styles.fromLeft : styles.left
            )}
          >
            {navLinks.map((navLink) => {
                return (
                  <li
                    key={navLink.name}
                    onClick={(e) => handleNavbar(e, navLink.path)}
                  >
                    <NavLinkMobile {...navLink} />
                  </li>
                );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
