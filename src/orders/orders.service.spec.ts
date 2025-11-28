import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Instrument } from 'src/instruments/instrument.entity';
import { InstrumentType } from 'src/instruments/instruments.enums';
import { InstrumentsService } from 'src/instruments/instruments.service';
import { Marketdata } from 'src/marketdata/marketdata.entity';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { CreateOrderRequestDto } from './dto/create-order.dto';
import { Order } from './order.entity';
import { OrderSide, OrderStatus, OrderType } from './orders.enums';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    addCommonTableExpression: jest.fn().mockReturnThis(),
    innerJoinAndMapMany: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),

    getMany: jest.fn(),
    getRawOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserService = {
    findOneByAccountNumber: jest.fn(),
  };

  const mockInstrumentsService = {
    findArsInstrument: jest.fn(),
    findOneWithLatestMarketdataByTicker: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository,
        },
        {
          provide: UsersService,
          useValue: mockUserService,
        },
        {
          provide: InstrumentsService,
          useValue: mockInstrumentsService,
        },

      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllFilledStockOrdersWithLatestMarketdataByUser', () => {
    it('should return an array of filled orders with latest marketdata', async () => {
      const user: User = {
        id: 1,
        email: '',
        accountNumber: '',
        orders: []
      };

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

      jest.spyOn(mockRepository, 'getMany').mockResolvedValueOnce(filledStockOrders)

      const foundOrders = await service.findAllFilledStockOrdersWithLatestMarketdataByUser(user);

      expect(foundOrders).toEqual(filledStockOrders);
      expect(mockRepository.getMany).toHaveBeenCalled();
    });
  });

  describe('getTotalCashInArsFromOrdersByUserId', () => {
    it('should return total ars available', async () => {
      const user: User = { id: 1, } as User;

      const arsAvailable = 753000;

      jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: arsAvailable })

      const foundTotalArs = await service.getTotalCashInArsFromOrdersByUserId(user);

      expect(foundTotalArs).toEqual(arsAvailable);
      expect(mockRepository.getRawOne).toHaveBeenLastCalledWith();
    });
  });

  describe('createOrder', () => {
    const user: User = { id: 1, accountNumber: '10001', } as User;

    const arsInstrument: Instrument = {
      id: 66,
      ticker: 'ARS',
      name: 'PESOS',
      type: InstrumentType.Currency,
    } as Instrument;

    describe('cash-in order', () => {
      it('should create with filled status', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.CashIn,
          size: 10000,
        };

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findArsInstrument').mockResolvedValueOnce(arsInstrument);

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          datetime: expect.any(Date),
          'instrument': {
            'id': 66,
            'name': 'PESOS',
            'ticker': 'ARS',
            'type': 'MONEDA',
          },
          'price': 1,
          'side': 'CASH_IN',
          'size': 10000,
          'status': 'FILLED',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });
    });

    describe('cash-out order', () => {
      it('should create with filled status', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.CashOut,
          size: 10000,
        };

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findArsInstrument').mockResolvedValueOnce(arsInstrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 50000 })

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          datetime: expect.any(Date),
          'instrument': {
            'id': 66,
            'name': 'PESOS',
            'ticker': 'ARS',
            'type': 'MONEDA',
          },
          'price': 1,
          'side': 'CASH_OUT',
          'size': 10000,
          'status': 'FILLED',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status if not enough ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.CashOut,
          size: 10000,
        };

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findArsInstrument').mockResolvedValueOnce(arsInstrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 0 })

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          datetime: expect.any(Date),
          'instrument': {
            'id': 66,
            'name': 'PESOS',
            'ticker': 'ARS',
            'type': 'MONEDA',
          },
          'price': 1,
          'side': 'CASH_OUT',
          'size': 10000,
          'status': 'REJECTED',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });
    });

    describe('market buy order', () => {
      it('should create with filled status using size', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          size: 100,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 12345 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'BUY',
          'size': 100,
          'status': 'FILLED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using size when not enough owned ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          size: 100,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 1000 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'BUY',
          'size': 100,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with filled status using ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          ars: 1001.33,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 12345 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 1001.33,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'BUY',
          'size': 8,
          'status': 'FILLED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using ars when not enough owned ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          ars: 1001.33,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 500 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 1001.33,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'BUY',
          'size': 8,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should throw when not size or ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          ticker: 'PMAT',
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when both size and ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          ticker: 'PMAT',
          size: 100,
          ars: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when not ticker', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          size: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when invalid needed ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Buy,
          size: -2,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 500 });

        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('market sell order', () => {
      it('should create with filled status using size', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          size: 12,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 33 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'SELL',
          'size': 12,
          'status': 'FILLED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using size when not enough owned size', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          size: 12,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 3 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'SELL',
          'size': 12,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with filled status using ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          ars: 1001.33,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 33 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 1001.33,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'SELL',
          'size': 8,
          'status': 'FILLED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using ars when not enough owned size', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          ars: 620.33,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 2 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 620.33,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 123.45,
          'side': 'SELL',
          'size': 5,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'MARKET',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should throw when not size or ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          ticker: 'PMAT',
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when both size and ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          ticker: 'PMAT',
          size: 100,
          ars: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when not ticker', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          size: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when invalid needed ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Market,
          side: OrderSide.Sell,
          size: -2,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 2 });

        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('limit buy order', () => {
      it('should create with new status using size', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          size: 100,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 12345 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'BUY',
          'size': 100,
          'status': 'NEW',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using size when not enough ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          size: 100,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 876 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'BUY',
          'size': 100,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with new status using ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          ars: 12344.92,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 12345 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 12344.92,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'BUY',
          'size': 124,
          'status': 'NEW',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          ars: 12344.92,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 579.4 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 12344.92,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'BUY',
          'size': 124,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should throw when not price', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          ticker: 'PMAT',
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when not size or ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          ticker: 'PMAT',
          price: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when both size and ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          ticker: 'PMAT',
          price: 100,
          size: 100,
          ars: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when not ticker', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          price: 100,
          size: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when invalid needed ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Buy,
          price: 100,
          size: -2,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalCashInArsFromOrdersByUserId
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ ars: 12345 });

        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(UnprocessableEntityException);
      });
    });


    describe('limit sell order', () => {
      it('should create with new status using size', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          size: 100,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 1000 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'SELL',
          'size': 100,
          'status': 'NEW',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using size when not enough ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          size: 100,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 2 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'SELL',
          'size': 100,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with new status using ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          ars: 12344.92,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 12345 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 12344.92,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'SELL',
          'size': 124,
          'status': 'NEW',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should create with rejected status using ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          ars: 12344.92,
          price: 99.35,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.// service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 2 });

        await service.createOrder(createOrderRequestDto);

        expect(mockRepository.create).toHaveBeenLastCalledWith({
          'accountNumber': '10001',
          'ars': 12344.92,
          'datetime': expect.any(Date),
          'instrument': {
            'id': 47,
            'marketdata': [
              {
                'close': 123.45,
              },
            ],
            'name': 'Pampa Holding S.A.',
            'ticker': 'PAMP',
            'type': 'ACCIONES',
          },
          'price': 99.35,
          'side': 'SELL',
          'size': 124,
          'status': 'REJECTED',
          'ticker': 'PMAT',
          'type': 'LIMIT',
          'user': {
            'accountNumber': '10001',
            'id': 1,
          },
        });
      });

      it('should throw when not price', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          ticker: 'PMAT',
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when not size or ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          ticker: 'PMAT',
          price: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when both size and ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          ticker: 'PMAT',
          price: 100,
          size: 100,
          ars: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when not ticker', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          price: 100,
          size: 100,
        };
        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(BadRequestException);
      });

      it('should throw when invalid needed ars', async () => {
        const createOrderRequestDto: CreateOrderRequestDto = {
          accountNumber: '10001',
          type: OrderType.Limit,
          side: OrderSide.Sell,
          price: 100,
          size: -2,
          ticker: 'PMAT',
        };

        const instrument = {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: InstrumentType.Stock,
          marketdata: [{ close: 123.45 }] as Marketdata[],
        } as Instrument;

        jest.spyOn(mockUserService, 'findOneByAccountNumber').mockResolvedValueOnce(user);
        jest.spyOn(mockInstrumentsService, 'findOneWithLatestMarketdataByTicker').mockResolvedValueOnce(instrument);

        // service.getTotalSizeByUserAndInstrument
        jest.spyOn(mockRepository, 'getRawOne').mockResolvedValueOnce({ totalsize: 2 });

        await expect(service.createOrder(createOrderRequestDto)).rejects.toThrow(UnprocessableEntityException);
      });
    });


  });
});
