#!/usr/bin/env python3
"""
Pull actual trade history and P&L from Kraken API
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import Config
from kraken_client import KrakenClient


async def main():
    config = Config()
    client = KrakenClient(config)
    
    try:
        await client.connect()
        
        # 1. Get current balance
        print("=" * 60)
        print("KRAKEN ACCOUNT STATUS")
        print("=" * 60)
        
        balance = await client.get_account_balance()
        print("\n[CURRENT BALANCE]")
        total_usd = 0
        for asset, amount in balance.items():
            amt = float(amount)
            if amt > 0.001:
                print(f"  {asset}: {amt:.6f}")
                if asset in ['ZUSD', 'USD']:
                    total_usd += amt
        
        # Get XLM price for total value
        ticker = await client.get_ticker('XLMUSD')
        xlm_price = float(list(ticker.values())[0]['c'][0])
        print(f"\n  XLM/USD Price: ${xlm_price:.4f}")
        
        xlm_balance = float(balance.get('XXLM', balance.get('XLM', 0)))
        xlm_value = xlm_balance * xlm_price
        total_value = total_usd + xlm_value
        print(f"\n  Total USD: ${total_usd:.2f}")
        print(f"  XLM Value: ${xlm_value:.2f} ({xlm_balance:.2f} XLM)")
        print(f"  TOTAL VALUE: ${total_value:.2f}")
        
        # 2. Get trade history
        print("\n" + "=" * 60)
        print("TRADE HISTORY (Last 50 trades)")
        print("=" * 60)
        
        trades = await client.get_trades_history()
        
        if not trades.get('trades'):
            print("No trades found")
        else:
            trade_list = list(trades['trades'].items())
            
            # Stats
            total_trades = len(trade_list)
            buys = [t for tid, t in trade_list if t.get('type') == 'buy']
            sells = [t for tid, t in trade_list if t.get('type') == 'sell']
            
            print(f"\nTotal trades: {total_trades}")
            print(f"Buys: {len(buys)}, Sells: {len(sells)}")
            
            # Calculate P&L from trades
            total_buy_cost = sum(float(t.get('cost', 0)) for t in buys)
            total_sell_revenue = sum(float(t.get('cost', 0)) for t in sells)
            total_fees = sum(float(t.get('fee', 0)) for tid, t in trade_list)
            
            realized_pnl = total_sell_revenue - total_buy_cost - total_fees
            
            print(f"\n[P&L SUMMARY]")
            print(f"  Total Buy Cost: ${total_buy_cost:.2f}")
            print(f"  Total Sell Revenue: ${total_sell_revenue:.2f}")
            print(f"  Total Fees: ${total_fees:.2f}")
            print(f"  Realized P&L: ${realized_pnl:.2f}")
            
            # Win rate (simplified - sell > avg buy price)
            if sells:
                avg_sell_price = sum(float(t.get('price', 0)) for t in sells) / len(sells)
                avg_buy_price = sum(float(t.get('price', 0)) for t in buys) / len(buys) if buys else 0
                print(f"\n  Avg Buy Price: ${avg_buy_price:.6f}")
                print(f"  Avg Sell Price: ${avg_sell_price:.6f}")
            
            # Show recent trades
            print("\n[RECENT TRADES]")
            for trade_id, trade in trade_list[:10]:
                time_str = datetime.fromtimestamp(float(trade.get('time', 0))).strftime('%Y-%m-%d %H:%M')
                side = trade.get('type', '?').upper()
                pair = trade.get('pair', '?')
                vol = float(trade.get('vol', 0))
                price = float(trade.get('price', 0))
                cost = float(trade.get('cost', 0))
                fee = float(trade.get('fee', 0))
                print(f"  {time_str} | {side:4} | {vol:10.4f} @ ${price:.6f} = ${cost:.2f} (fee: ${fee:.4f})")
        
        # 3. Check for open orders
        print("\n" + "=" * 60)
        print("OPEN ORDERS")
        print("=" * 60)
        
        open_orders = await client.get_open_orders()
        if open_orders.get('open'):
            for oid, order in open_orders['open'].items():
                print(f"  {oid}: {order.get('descr', {}).get('order', 'Unknown')}")
        else:
            print("  No open orders")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
