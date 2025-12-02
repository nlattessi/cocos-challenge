## Cocos challenge

Se desarrolla API para resolver el ejercicio propuesto en https://github.com/cocoscap/cocos-challenge/blob/main/backend-challenge.md

## Setup

```bash
$ npm install
```

## Compilar y correr

Primero copiar el archivo `.env.sample` a `.env` y completarlo con los datos de la DB a conectarse.

Luego:

```bash
$ npm run start:dev
```
Y luego se puede acceder a la app en `http://localhost:3000`

## Para ejecutar los tests

```bash
$ npm run test
```

## Postman

Se disponibilza una colección de Postman para probar los endpoints (archivo `Cocos.postman_collection.json`)

## Endpoints

* GET `/instruments` -> Todos los activos
* GET `/instruments?query=nombre` -> Filtra los activos por nombre y ticker por el valor pasado en `query`
* GET `/accounts/<account_number>/portfolio` -> Devuelve el portfolio de la cuenta por el <account_number> del usuario
* POST `/orders`/ -> Crea una nueva orden según los datos enviados en el body
  * Payload para crear una orden `Cash-In`:
  ```json
  {
    "accountNumber": "10001",
    "type": "MARKET",
    "side": "CASH_IN",
    "size": 12345 -> Monto en ARS de la transaccción
  }
  ```
  * Payload para crear una orden `Cash-Out`:
  ```json
  {
    "accountNumber": "10001",
    "type": "MARKET",
    "side": "CASH_OUT",
    "size": 12345 -> Monto en ARS de la transaccción
  }
  ```
  * Payload para crear una orden de `compra` del tipo `Market` por cantidad de acciones:
  ```json
  {
    "accountNumber": "10001",
    "type": "MARKET",
    "side": "BUY",
    "ticker": "PAMP", -> Ticker del instrumento a comprar
    "size": 10 -> Cantidad de acciones a comprar
  }
  ```
  * Payload para crear una orden de `venta` del tipo `Market` por cantidad de acciones:
  ```json
  {
    "accountNumber": "10001",
    "type": "MARKET",
    "side": "BUY",
    "ticker": "PAMP", -> Ticker del instrumento a vender
    "size": 10 -> Cantidad de acciones a vender
  }
  ```
  * Payload para crear una orden de `compra` del tipo `Market` por monto en ARS a invertir:
  ```json
  {
    "accountNumber": "10001",
    "type": "MARKET",
    "side": "BUY",
    "ticker": "PAMP", -> Ticker del instrumento a comprar
    "ars": 12345 -> Monto en ARS a invertir
  }
  ```
  * Payload para crear una orden de `venta` del tipo `Market` por monto en ARS a vender del activo:
  ```json
  {
    "accountNumber": "10001",
    "type": "MARKET",
    "side": "SELL",
    "ticker": "PAMP", -> Ticker del instrumento a vender
    "ars": 12345 -> Monto en ARS a vender
  }
  ```
  * Payload para crear una orden de `compra` del tipo `Limit` por cantidad de acciones:
  ```json
  {
    "accountNumber": "10001",
    "type": "LIMIT",
    "side": "BUY",
    "ticker": "PAMP", -> Ticker del instrumento a comprar
    "price": 10.5, -> Precio de compra
    "size": 10 -> Cantidad de acciones a comprar
  }
  ```
  * Payload para crear una orden de `venta` del tipo `Limit` por cantidad de acciones:
  ```json
  {
    "accountNumber": "10001",
    "type": "LIMIT",
    "side": "SELL",
    "ticker": "PAMP", -> Ticker del instrumento a comprar
    "price": 10.5, -> Precio de venta
    "size": 5 -> Cantidad de acciones a vender
  }
  ```
  * Payload para crear una orden de `compra` del tipo `Limit` por monto en ARS a invertir:
  ```json
  {
    "accountNumber": "10001",
    "type": "LIMIT",
    "side": "BUY",
    "ticker": "PAMP", -> Ticker del instrumento a comprar
    "price": 10.5, -> Precio de compra
    "ars": 12345 -> Monto en ARS a invertir
  }
  ```
  * Payload para crear una orden de `venta` del tipo `Limit` por monto en ARS a vender del activo:
  ```json
  {
    "accountNumber": "10001",
    "type": "LIMIT",
    "side": "SELL",
    "ticker": "PAMP", -> Ticker del instrumento a comprar
    "price": 10.5, -> Precio de venta
    "ars": 123 -> Monto en ARS a vender
  }
  ```