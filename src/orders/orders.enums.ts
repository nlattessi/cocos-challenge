export enum OrderType {
    Limit = 'LIMIT',
    Market = 'MARKET',
}

export enum OrderSide {
    Buy = 'BUY',
    CashOut = 'CASH_OUT',
    CashIn = 'CASH_IN',
    Sell = 'SELL',
}

export enum OrderStatus {
    Filled = 'FILLED',
    New = 'NEW',
    Rejected = 'REJECTED',
    Cancelled = 'CANCELLED',
}