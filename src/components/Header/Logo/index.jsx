import React from 'react';
import cn from 'classnames';
import styles from './Logo.module.sass';

export const Logo = () => {
  return (
    <a href="https://monkainft.com/">
      <div className={cn(styles.buttonContainer, styles.alternate)}>
        <h2>MONKAI</h2>
      </div>
    </a>
  );
};
