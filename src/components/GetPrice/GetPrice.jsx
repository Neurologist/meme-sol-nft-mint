import React, { useState, useEffect } from "react";

export default function GetPrice({ UNIT_PRICE }) {
  const [coinInfo, setCoinInfo] = useState();
  const coinId = "solana";

  const getPrice = async () => {
    // eslint-disable-next-line no-unused-vars
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}`
    )
      .then((res) => res.json())
      .then((info) => {
        setCoinInfo({
          coinInfo: {
            price: info.market_data.current_price.usd,
          },
        });
      })
      .catch((error) => {
        setCoinInfo();
      });
  };

  useEffect(() => {
    getPrice();
  }, []);

  return coinInfo?.coinInfo ? (
    <p className="payment-price-usd">
      ${(coinInfo.coinInfo.price * UNIT_PRICE).toFixed(2)}{" "}
    </p>
  ) : (
    <p></p>
  );
}
