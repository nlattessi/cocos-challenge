import { Body, ClassSerializerInterceptor, Controller, Post, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { CreateOrderRequestDto } from './dto/create-order.dto';
import { Order } from './order.entity';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ type: Order })
    @Post()
    public async createOrder(@Body() order: CreateOrderRequestDto): Promise<Order> {
        return this.ordersService.createOrder(order);
    }
}
