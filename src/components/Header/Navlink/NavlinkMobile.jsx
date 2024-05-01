import React from "react";
import cn from "classnames";
import styles from "./Navlink.module.sass";

export default function NavlinkMobile({ path, title, mobile }) {
  return (
    <a href={path}>
      <div className={cn(styles.cNavItemMobile, styles.cursorPointer)}>
        <div className={cn(styles.cNavQMobile, styles.cursorPointe)}>
          <div className={styles.cNavQTextMobile}>
            <div className={styles.navQTextMobile}>
              { title}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
