import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Instrument } from 'src/instruments/instrument.entity';
import { InstrumentType } from 'src/instruments/instruments.enums';
import { User } from 'src/users/user.entity';
import request from 'supertest';
import { App } from 'supertest/types';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrderSide, OrderStatus, OrderType } from './orders.enums';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let app: INestApplication<App>;

  const mockOrdersService = {
    createOrder: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('POST /orders', () => {
    it('should return a new order', async () => {
      const order: Order = {
        id: 1,
        size: 12345,
        price: 1,
        type: OrderType.Market,
        side: OrderSide.CashIn,
        status: OrderStatus.Filled,
        datetime: new Date(2023, 7, 12, 12, 31, 20),
        user: { id: 1, accountNumber: '10001' } as User,
        instrument: { ticker: 'ARS', name: 'PESOS', type: InstrumentType.Currency } as Instrument,
      };

      jest.spyOn(mockOrdersService, 'createOrder').mockResolvedValueOnce(order);

      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'size': 12345
        })
        .expect(201)
        .expect({
          'size': 12345,
          'price': 1,
          'type': 'MARKET',
          'side': 'CASH_IN',
          'status': 'FILLED',
          datetime: '2023-08-12T15:31:20.000Z',
          'instrument': {
            'ticker': 'ARS',
            'name': 'PESOS',
            'type': 'MONEDA'
          }
        });
    });

    it('should return bad request when not account number', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({})
        .expect(400)
        .expect({
          message: [
            'accountNumber must be longer than or equal to 1 characters',
            'accountNumber should not be empty',
            'accountNumber must be a string',
            'type must be one of the following values: LIMIT, MARKET',
            'side must be one of the following values: BUY, CASH_OUT, CASH_IN, SELL'
          ],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when account number is not a string', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': 10001,
          'type': 'MARKET',
          'side': 'CASH_IN',
          'size': 12345
        })
        .expect(400)
        .expect({
          message: [
            'accountNumber must be longer than or equal to 1 characters',
            'accountNumber must be a string'
          ],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when invalid order type', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'INVALID',
          'side': 'CASH_IN',
          'size': 12345
        })
        .expect(400)
        .expect({
          message: ['type must be one of the following values: LIMIT, MARKET'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when invalid order side', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'INVALID',
          'size': 12345
        })
        .expect(400)
        .expect({
          message: [
            'side must be one of the following values: BUY, CASH_OUT, CASH_IN, SELL'
          ],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when size = 0', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'size': 0,
        })
        .expect(400)
        .expect({
          message: ['size must not be less than 1'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when size < 0', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'size': -1,
        })
        .expect(400)
        .expect({
          message: ['size must not be less than 1'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when size > 10000000', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'size': 100000001,
        })
        .expect(400)
        .expect({
          message: ['size must not be greater than 100000000'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when size is not a number', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'size': 'size',
        })
        .expect(400)
        .expect({
          message: [
            'size must not be greater than 100000000',
            'size must not be less than 1',
            'size must be a number conforming to the specified constraints'
          ],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when ars = 0', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'ars': 0,
        })
        .expect(400)
        .expect({
          message: ['ars must not be less than 1'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when ars < 0', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'ars': -1,
        })
        .expect(400)
        .expect({
          message: ['ars must not be less than 1'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when ars > 10000000', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'ars': 100000001,
        })
        .expect(400)
        .expect({
          message: ['ars must not be greater than 100000000'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when ars is not a number', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'ars': 'ars',
        })
        .expect(400)
        .expect({
          message: [
            'ars must not be greater than 100000000',
            'ars must not be less than 1',
            'ars must be a number conforming to the specified constraints'
          ],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when price = 0', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'price': 0,
        })
        .expect(400)
        .expect({
          message: ['price must not be less than 1'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when price < 0', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'price': -1,
        })
        .expect(400)
        .expect({
          message: ['price must not be less than 1'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when price > 10000000', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'price': 100000001,
        })
        .expect(400)
        .expect({
          message: ['price must not be greater than 100000000'],
          error: 'Bad Request',
          statusCode: 400
        });
    });

    it('should return bad request when price is not a number', async () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          'accountNumber': '10001',
          'type': 'MARKET',
          'side': 'CASH_IN',
          'price': 'price',
        })
        .expect(400)
        .expect({
          message: [
            'price must not be greater than 100000000',
            'price must not be less than 1',
            'price must be a number conforming to the specified constraints'
          ],
          error: 'Bad Request',
          statusCode: 400
        });
    });




  });
});
