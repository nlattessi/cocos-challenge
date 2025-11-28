import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marketdata } from './marketdata.entity';
import { MarketdataService } from './marketdata.service';

@Module({
  imports: [TypeOrmModule.forFeature([Marketdata])],
  providers: [MarketdataService],
  exports: [MarketdataService],
})
export class MarketdataModule { }
