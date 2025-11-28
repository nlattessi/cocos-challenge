import { Test, TestingModule } from '@nestjs/testing';
import { Instrument } from 'src/instruments/instrument.entity';
import { InstrumentType } from 'src/instruments/instruments.enums';
import { Marketdata } from 'src/marketdata/marketdata.entity';
import { MarketdataService } from 'src/marketdata/marketdata.service';
import { Order } from 'src/orders/order.entity';
import { OrderSide, OrderStatus, OrderType } from 'src/orders/orders.enums';
import { OrdersService } from 'src/orders/orders.service';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { PortfolioEntity } from './portfolio.entity';
import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  let service: PortfolioService;

  const mockUsersService = {
    findOneByAccountNumber: jest.fn(),
  };

  const mockOrdersService = {
    getTotalCashInArsFromOrdersByUserId: jest.fn(),
    findAllFilledStockOrdersWithLatestMarketdataByUser: jest.fn(),
  };

  const mockMarketdataService = {
    findLastClosePriceByInstrumentId: jest.fn(),
    findLastClosePriceByTicker: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: MarketdataService,
          useValue: mockMarketdataService,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPortfolioByAccountNumber', () => {
    it('should get a complete portfolio', async () => {
      const accountNumber = '1000';
      const userId = 1;
      const user = { id: userId, accountNumber } as User;
      const arsAvailable = 753000;

      const pampaLatestMarketdata = { close: 925.85 } as Marketdata;
      const pampaInstrument = { id: 47, ticker: 'PAMP', name: 'Pampa Holding S.A.', type: InstrumentType.Stock, marketdata: [pampaLatestMarketdata], } as Instrument;

      const bmaLatestMarketdata = { close: 1502.80 } as Marketdata;
      const bmaInstrument = { id: 31, ticker: 'BMA', name: 'Banco Macro S.A.', type: InstrumentType.Stock, marketdata: [bmaLatestMarketdata] } as Instrument;

      const filledStockOrders = [
        {
          id: 98,
          instrument: pampaInstrument,
          user,
          size: 50,
          price: 930.00,
          type: OrderType.Market,
          side: OrderSide.Buy,
          status: OrderStatus.Filled,
          datetime: new Date(2023, 7, 12, 12, 31, 20),
        },
        {
          id: 100,
          instrument: pampaInstrument,
          user,
          size: 10,
          price: 940.00,
          type: OrderType.Market,
          side: OrderSide.Sell,
          status: OrderStatus.Filled,
          datetime: new Date(2023, 7, 12, 14, 51, 20),
        },
        {
          id: 105,
          instrument: bmaInstrument,
          user,
          size: 20,
          price: 1540.00,
          type: OrderType.Limit,
          side: OrderSide.Buy,
          status: OrderStatus.Filled,
          datetime: new Date(2023, 7, 13, 12, 51, 20),
        },
        {
          id: 106,
          instrument: { id: 54, ticker: 'METR', name: 'MetroGAS S.A.', type: InstrumentType.Stock, marketdata: [{ close: 229.50 } as Marketdata], } as Instrument,
          user,
          size: 500,
          price: 250.00,
          type: OrderType.Market,
          side: OrderSide.Buy,
          status: OrderStatus.Filled,
          datetime: new Date(2023, 7, 13, 14, 11, 20),
        },
        {
          id: 105,
          instrument: bmaInstrument,
          user,
          size: 30,
          price: 1530.00,
          type: OrderType.Market,
          side: OrderSide.Sell,
          status: OrderStatus.Filled,
          datetime: new Date(2023, 7, 13, 15, 13, 20),
        },
      ] as Order[];

      jest.spyOn(mockUsersService, 'findOneByAccountNumber').mockResolvedValue(user);
      jest.spyOn(mockOrdersService, 'getTotalCashInArsFromOrdersByUserId').mockResolvedValue(arsAvailable);
      jest.spyOn(mockOrdersService, 'findAllFilledStockOrdersWithLatestMarketdataByUser').mockResolvedValue(filledStockOrders);

      const portfolio = await service.getPortfolioByAccountNumber(accountNumber);

      expect(portfolio).toEqual({
        accountTotal: 915100,
        arsAvailable,
        assets: [
          {
            lastClosePrice: 925.85,
            name: 'Pampa Holding S.A.',
            performance: -0.1778975741239892,
            sharesAmount: 40,
            ticker: 'PAMP',
            totalValue: 37100,
          },
          {
            lastClosePrice: 229.5,
            name: 'MetroGAS S.A.',
            performance: -8.200000000000001,
            sharesAmount: 500,
            ticker: 'METR',
            totalValue: 125000,
          },
        ],
      } as PortfolioEntity);
    });
  });
});
