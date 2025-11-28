import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InstrumentType } from 'src/instruments/instruments.enums';
import { InstrumentsService } from 'src/instruments/instruments.service';
import { Marketdata } from 'src/marketdata/marketdata.entity';
import { ORDERED_MARKETDATA_QUERY } from 'src/marketdata/marketdata.service';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';
import { CreateOrderRequestDto } from './dto/create-order.dto';
import { Order } from './order.entity';
import { OrderSide, OrderStatus, OrderType } from './orders.enums';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private readonly ordersRepository: Repository<Order>,
        private readonly usersService: UsersService,
        private readonly instrumentsService: InstrumentsService,
    ) { }

    // Query que obtiene las ordenes junto con la info de su instrumento
    // y del último marketdata para ese instrumento ordenado por la fecha descendiente.
    // Para esto usa la Window Function "ROW_NUMBER" wrappeada en un CTE
    // para mejorar la lectura.
    // De esta forma en la misma entidad Order puedo acceder a su último precio
    // de mercado sin necesidad de hacer más consultas a la DB
    // (cómo por ejemplo iterar por cada orden para obtener el último precio de su instrumento)
    public findAllFilledStockOrdersWithLatestMarketdataByUser(user: User): Promise<Order[]> {
        return this.ordersRepository
            .createQueryBuilder('orders')
            .innerJoinAndSelect('orders.instrument', 'instruments')

            .addCommonTableExpression(ORDERED_MARKETDATA_QUERY, 'ordered_marketdata')
            .innerJoinAndSelect('ordered_marketdata', 'om', 'om.instrumentid = instruments.id')
            .innerJoinAndMapMany('instruments.marketdata', Marketdata, 'marketdata', 'marketdata.id = om.id')

            .where('orders.user = :userId', { userId: user.id })
            .andWhere('orders.status = :orderStatus', { orderStatus: OrderStatus.Filled })
            .andWhere('instruments.type = :instrumentType', { instrumentType: InstrumentType.Stock })

            .andWhere('om.row_num = 1')

            .getMany();
    }

    // Query que obtiene el total de pesos de un usuario.
    // Para esto hace un SUM de los montos de las ordenes
    // y usa un CASE para determinar si la orden suma o resta a ese total.
    // Nota: El COALESCE es para que si no hay ordenes devuelva 0 y no null.
    public async getTotalCashInArsFromOrdersByUserId(user: User): Promise<number> {
        const result = await this.ordersRepository
            .createQueryBuilder('orders')
            .select(`COALESCE( SUM(
                CASE
                    WHEN (orders.side = 'CASH_IN' OR orders.side = 'SELL') THEN (orders.size * orders.price)
                    WHEN (orders.side = 'CASH_OUT' OR orders.side = 'BUY') THEN -(orders.size * orders.price)
                    ELSE 0
                END), 0) AS ars`)
            .where('orders.user = :userId', { userId: user.id })
            .andWhere('orders.status = :orderStatus', { orderStatus: OrderStatus.Filled })
            .getRawOne();

        return parseInt(result.ars);
    }

    public createOrder(createOrder: CreateOrderRequestDto): Promise<Order> {
        const { type, side } = createOrder;

        if (type === OrderType.Market) {
            switch (side) {
                case OrderSide.CashIn:
                    return this.createCashInOrder(createOrder);
                case OrderSide.CashOut:
                    return this.createCashOutOrder(createOrder);
                case OrderSide.Buy:
                    return this.createMarketBuyOrder(createOrder);
                case OrderSide.Sell:
                    return this.createMarketSellOrder(createOrder);
            }
        }

        if (type === OrderType.Limit) {
            switch (side) {
                case OrderSide.Buy:
                    return this.createLimitBuyOrder(createOrder);
                case OrderSide.Sell:
                    return this.createLimitSellOrder(createOrder);
            }
        }

        throw new BadRequestException('invalid request params');
    }

    private async createCashInOrder(createOrder: CreateOrderRequestDto): Promise<Order> {
        const user = await this.usersService.findOneByAccountNumber(createOrder.accountNumber)
        const instrument = await this.instrumentsService.findArsInstrument();

        const datetime = new Date(Date.now());
        datetime.setMilliseconds(0);

        const order = this.ordersRepository.create({
            ...createOrder,
            price: 1.00,
            status: OrderStatus.Filled,
            user,
            instrument,
            datetime,
        })

        return this.ordersRepository.save(order)
    }

    private async createCashOutOrder(createOrder: CreateOrderRequestDto): Promise<Order> {
        const { size: neededArsToTransfer } = createOrder;

        if (!neededArsToTransfer) {
            throw new BadRequestException('size is required');
        }

        const user = await this.usersService.findOneByAccountNumber(createOrder.accountNumber)
        const instrument = await this.instrumentsService.findArsInstrument();
        const ownedArs = await this.getTotalCashInArsFromOrdersByUserId(user)

        const status = ownedArs >= neededArsToTransfer
            ? OrderStatus.Filled
            : OrderStatus.Rejected;

        const datetime = new Date(Date.now());
        datetime.setMilliseconds(0);

        const order = this.ordersRepository.create({
            ...createOrder,
            price: 1.00,
            status: status,
            user,
            instrument,
            datetime,
        })

        return this.ordersRepository.save(order)
    }

    private async createMarketBuyOrder(createOrder: CreateOrderRequestDto): Promise<Order> {
        const { size, ars, ticker } = createOrder;

        if (!size && !ars) {
            throw new BadRequestException('size or ars are required');
        }
        if (size && ars) {
            throw new BadRequestException('size and ars were sent but only one is required');
        }
        if (!ticker) {
            throw new BadRequestException('ticker is required');
        }

        const user = await this.usersService.findOneByAccountNumber(createOrder.accountNumber);

        const instrument = await this.instrumentsService.findOneWithLatestMarketdataByTicker(ticker);
        const lastClosePrice = instrument.marketdata.at(0)?.close;
        if (!lastClosePrice || lastClosePrice <= 0) {
            throw new UnprocessableEntityException('invalid last close price');
        }

        const ownedArs = await this.getTotalCashInArsFromOrdersByUserId(user);

        let neededArs = 0
        if (size) {
            neededArs = size * lastClosePrice;
        } else if (ars) {
            const size = Math.floor(ars / lastClosePrice);
            neededArs = size * lastClosePrice;
            createOrder.size = size;
        } else {
            throw new BadRequestException('size or ars are invalid');
        }
        if (neededArs <= 0) {
            throw new UnprocessableEntityException('invalid needed ars');
        }

        const status = ownedArs >= neededArs
            ? OrderStatus.Filled
            : OrderStatus.Rejected;

        const datetime = new Date(Date.now());
        datetime.setMilliseconds(0);

        const order = this.ordersRepository.create({
            ...createOrder,
            price: lastClosePrice,
            status,
            user,
            instrument,
            datetime,
        });

        return this.ordersRepository.save(order);
    }

    private async createMarketSellOrder(createOrder: CreateOrderRequestDto): Promise<Order> {
        const { size, ars, ticker } = createOrder;

        if (!size && !ars) {
            throw new BadRequestException('size or ars are required');
        }
        if (size && ars) {
            throw new BadRequestException('size and ars were sent but only one is required');
        }
        if (!ticker) {
            throw new BadRequestException('ticker is required');
        }

        const user = await this.usersService.findOneByAccountNumber(createOrder.accountNumber);

        const instrument = await this.instrumentsService.findOneWithLatestMarketdataByTicker(ticker);
        const lastClosePrice = instrument.marketdata.at(0)?.close;
        if (!lastClosePrice || lastClosePrice <= 0) {
            throw new UnprocessableEntityException('invalid last close price');
        }

        const ownedSize = await this.getTotalSizeByUserAndInstrument(user.id, instrument.id);

        let sellSize = 0;
        if (size) {
            sellSize = size;
        } else if (ars) {
            sellSize = Math.floor(ars / lastClosePrice);
        } else {
            throw new BadRequestException('size or ars are invalid');
        }
        if (sellSize <= 0) {
            throw new UnprocessableEntityException('invalid sell size');
        }

        const status = ownedSize >= sellSize
            ? OrderStatus.Filled
            : OrderStatus.Rejected;

        const datetime = new Date(Date.now());
        datetime.setMilliseconds(0);

        const order = this.ordersRepository.create({
            ...createOrder,
            price: lastClosePrice,
            size: sellSize,
            status,
            user,
            instrument,
            datetime,
        });

        return this.ordersRepository.save(order);
    }

    private async createLimitBuyOrder(createOrder: CreateOrderRequestDto): Promise<Order> {
        const { size, ars, ticker, price: buyPrice } = createOrder;

        if (!buyPrice) {
            throw new BadRequestException('price is required');
        }
        if (!size && !ars) {
            throw new BadRequestException('size or ars are required');
        }
        if (size && ars) {
            throw new BadRequestException('size and ars were sent but only one is required');
        }
        if (!ticker) {
            throw new BadRequestException('ticker is required');
        }

        const user = await this.usersService.findOneByAccountNumber(createOrder.accountNumber);
        const instrument = await this.instrumentsService.findOneWithLatestMarketdataByTicker(ticker);

        const ownedArs = await this.getTotalCashInArsFromOrdersByUserId(user);

        let neededArs = 0
        if (size) {
            neededArs = size * buyPrice;
        } else if (ars) {
            const size = Math.floor(ars / buyPrice);
            neededArs = size * buyPrice;
            createOrder.size = size;
        } else {
            throw new BadRequestException('size or ars are invalid');
        }
        if (neededArs <= 0) {
            throw new UnprocessableEntityException('invalid needed ars');
        }

        const status = ownedArs >= neededArs
            ? OrderStatus.New
            : OrderStatus.Rejected;

        const datetime = new Date(Date.now());
        datetime.setMilliseconds(0);

        const order = this.ordersRepository.create({
            ...createOrder,
            price: buyPrice,
            status,
            user,
            instrument,
            datetime,
        });

        return this.ordersRepository.save(order);
    }

    private async createLimitSellOrder(createOrder: CreateOrderRequestDto): Promise<Order> {
        const { size, ars, ticker, price: sellPrice } = createOrder;

        if (!sellPrice) {
            throw new BadRequestException('price is required');
        }
        if (!size && !ars) {
            throw new BadRequestException('size or ars are required');
        }
        if (size && ars) {
            throw new BadRequestException('size and ars were sent but only one is required');
        }
        if (!ticker) {
            throw new BadRequestException('ticker is required');
        }

        const user = await this.usersService.findOneByAccountNumber(createOrder.accountNumber);
        const instrument = await this.instrumentsService.findOneWithLatestMarketdataByTicker(ticker);

        const ownedSize = await this.getTotalSizeByUserAndInstrument(user.id, instrument.id);

        let sellSize = 0;
        if (size) {
            sellSize = size;
        } else if (ars) {
            sellSize = Math.floor(ars / sellPrice);
        } else {
            throw new BadRequestException('size or ars are invalid');
        }
        if (sellSize <= 0) {
            throw new UnprocessableEntityException('invalid sell size');
        }

        const status = ownedSize >= sellSize
            ? OrderStatus.New
            : OrderStatus.Rejected;

        const datetime = new Date(Date.now());
        datetime.setMilliseconds(0);

        const order = this.ordersRepository.create({
            ...createOrder,
            price: sellPrice,
            size: sellSize,
            status,
            user,
            instrument,
            datetime,
        });

        return this.ordersRepository.save(order);
    }

    private async getTotalSizeByUserAndInstrument(userId: number, instrumentId: number): Promise<number> {
        const result = await this.ordersRepository.
            createQueryBuilder('orders')
            .innerJoin('orders.instrument', 'instruments')
            .select(`COALESCE( SUM(
                CASE
                    WHEN orders.side = 'SELL' THEN -orders.size
                    WHEN orders.side = 'BUY' THEN orders.size
                    ELSE 0
                END), 0) AS totalsize`)
            .where('orders.userid = :userId', { userId })
            .andWhere('orders.status = :orderStatus', { orderStatus: OrderStatus.Filled })
            .andWhere('instruments.id = :instrumentId', { instrumentId })
            .getRawOne();

        return parseInt(result.totalsize);
    }

}
