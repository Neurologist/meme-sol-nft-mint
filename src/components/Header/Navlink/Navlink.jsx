import React from "react";
import cn from "classnames";
import styles from "./Navlink.module.sass";

export default function Navlink({ title, path, blank }) {
  return (
      <a href={path} target={`${blank ? "_blank" : "_self"}`}>
        <div className={cn(styles.cNavItem, styles.cursorPpointer)}>
          <div className={cn(styles.cNavQ, styles.cursorPointer)}>
            <div className={styles.cNavQText}>
              <div className={styles.navQText}>{title}</div>
            </div>
          </div>
        </div>
      </a>
  );
}
