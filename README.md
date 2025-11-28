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
  * Body de ejemplo:
  ```json
  {
    "accountNumber": "10001",
    "type": "MARKET",
    "side": "CASH_IN",
    "size": 12345
  }
  ```