import React from "react";
import styles from "./Header.module.sass";
import ReactPlayer from "react-player";/* 
import DripSmall from "../DripSmall"; */
const Headers = () => {
  return (
    <header className={styles.header}>
      <ReactPlayer
        className="react-player"
        url={[
          { src: "/assets/media/Flower_Shop_Banner.webm", type: "video/webm" },
          { src: "/assets/media/Flower_Shop_Banner.mp4", type: "video/mp4" },
        ]}
        width="100%"
        height="auto"
        playing={true}
        volume={0}
        loop={true}
        playsinline={true}
        muted={true}
      />
      {/* 
      <DripSmall /> */}
    </header>
  );
};

export default Headers;
