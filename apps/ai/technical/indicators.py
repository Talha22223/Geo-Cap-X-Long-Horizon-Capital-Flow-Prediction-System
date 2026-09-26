"""
Pure Python technical indicators engine.
Computes 14 core technical indicators from historical OHLCV data.
"""
from __future__ import annotations
import math


class TechnicalIndicators:
    """Computes technical indicators from standard list-of-dicts OHLCV input."""

    @staticmethod
    def compute_all(ohlcv: list[dict]) -> dict:
        """
        Runs all indicator calculations on the provided OHLCV dataset.
        Returns a dictionary containing indicator time series.
        """
        if not ohlcv:
            return {}

        closes = [bar["close"] for bar in ohlcv]
        highs = [bar["high"] for bar in ohlcv]
        lows = [bar["low"] for bar in ohlcv]
        volumes = [bar["volume"] for bar in ohlcv]

        n = len(closes)
        
        # 1. SMAs
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)
        sma_200 = TechnicalIndicators.sma(closes, 200)

        # 2. EMAs
        ema_9 = TechnicalIndicators.ema(closes, 9)
        ema_20 = TechnicalIndicators.ema(closes, 20)
        ema_50 = TechnicalIndicators.ema(closes, 50)

        # 3. RSI
        rsi_14 = TechnicalIndicators.rsi(closes, 14)

        # 4. MACD
        macd_line, macd_signal, macd_hist = TechnicalIndicators.macd(closes)

        # 5. Bollinger Bands
        bb_upper, bb_middle, bb_lower = TechnicalIndicators.bollinger_bands(closes, 20, 2)

        # 6. ATR
        atr_14 = TechnicalIndicators.atr(highs, lows, closes, 14)

        # 7. VWAP
        vwap = TechnicalIndicators.vwap(highs, lows, closes, volumes)

        # 8. OBV
        obv = TechnicalIndicators.obv(closes, volumes)

        # 9. ADX
        adx, plus_di, minus_di = TechnicalIndicators.adx(highs, lows, closes, 14)

        # 10. Stochastic RSI
        stoch_k, stoch_d = TechnicalIndicators.stochastic_rsi(rsi_14, 14, 3, 3)

        # 11. Ichimoku
        tenkan, kijun, senkou_a, senkou_b, chikou = TechnicalIndicators.ichimoku(highs, lows, closes)

        # 12. Fibonacci Retracement
        fib_levels = TechnicalIndicators.fibonacci_retracement(highs, lows)

        # 13. Volume Profile
        vol_profile = TechnicalIndicators.volume_profile(closes, volumes, bins=10)

        # Format everything into aligned lists or final snapshots
        return {
            "sma_20": sma_20,
            "sma_50": sma_50,
            "sma_200": sma_200,
            "ema_9": ema_9,
            "ema_20": ema_20,
            "ema_50": ema_50,
            "rsi_14": rsi_14,
            "macd": {
                "line": macd_line,
                "signal": macd_signal,
                "histogram": macd_hist
            },
            "bollinger_bands": {
                "upper": bb_upper,
                "middle": bb_middle,
                "lower": bb_lower
            },
            "atr_14": atr_14,
            "vwap": vwap,
            "obv": obv,
            "adx": {
                "adx": adx,
                "plus_di": plus_di,
                "minus_di": minus_di
            },
            "stoch_rsi": {
                "k": stoch_k,
                "d": stoch_d
            },
            "ichimoku": {
                "tenkan_sen": tenkan,
                "kijun_sen": kijun,
                "senkou_span_a": senkou_a,
                "senkou_span_b": senkou_b,
                "chikou_span": chikou
            },
            "fibonacci": fib_levels,
            "volume_profile": vol_profile,
            "last_price": closes[-1] if closes else 0.0,
            "last_volume": volumes[-1] if volumes else 0.0,
        }

    @staticmethod
    def sma(data: list[float], period: int) -> list[float | None]:
        res = [None] * len(data)
        if len(data) < period:
            return res
        current_sum = sum(data[:period])
        res[period - 1] = round(current_sum / period, 4)
        for i in range(period, len(data)):
            current_sum = current_sum - data[i - period] + data[i]
            res[i] = round(current_sum / period, 4)
        return res

    @staticmethod
    def ema(data: list[float], period: int) -> list[float | None]:
        res = [None] * len(data)
        if len(data) < period:
            return res
        
        # Seed first EMA with SMA
        sma_val = sum(data[:period]) / period
        res[period - 1] = round(sma_val, 4)
        
        multiplier = 2.0 / (period + 1.0)
        for i in range(period, len(data)):
            prev_ema = res[i - 1]
            ema_val = (data[i] - prev_ema) * multiplier + prev_ema
            res[i] = round(ema_val, 4)
        return res

    @staticmethod
    def rsi(data: list[float], period: int = 14) -> list[float | None]:
        res = [None] * len(data)
        if len(data) <= period:
            return res
        
        gains = []
        losses = []
        for i in range(1, len(data)):
            change = data[i] - data[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(change))
        
        # Initial average gain/loss
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        if avg_loss == 0:
            res[period] = 100.0
        else:
            rs = avg_gain / avg_loss
            res[period] = round(100.0 - (100.0 / (1.0 + rs)), 4)
            
        for i in range(period + 1, len(data)):
            gain = gains[i - 1]
            loss = losses[i - 1]
            
            # Wilder's smoothing
            avg_gain = (avg_gain * (period - 1) + gain) / period
            avg_loss = (avg_loss * (period - 1) + loss) / period
            
            if avg_loss == 0:
                res[i] = 100.0
            else:
                rs = avg_gain / avg_loss
                res[i] = round(100.0 - (100.0 / (1.0 + rs)), 4)
        return res

    @staticmethod
    def macd(data: list[float], fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[list[float | None], list[float | None], list[float | None]]:
        n = len(data)
        macd_line = [None] * n
        signal_line = [None] * n
        hist = [None] * n

        ema_fast = TechnicalIndicators.ema(data, fast)
        ema_slow = TechnicalIndicators.ema(data, slow)

        # Compute MACD line
        for i in range(n):
            if ema_fast[i] is not None and ema_slow[i] is not None:
                macd_line[i] = round(ema_fast[i] - ema_slow[i], 4)

        # Filter out leading Nones to calculate signal line (which is EMA of MACD line)
        first_valid = next((idx for idx, val in enumerate(macd_line) if val is not None), -1)
        if first_valid == -1 or n - first_valid < signal:
            return macd_line, signal_line, hist

        valid_macd = macd_line[first_valid:]
        # Calculate EMA on the valid segment
        valid_signal = TechnicalIndicators.ema(valid_macd, signal)
        
        # Align signal back to original list length
        for i in range(len(valid_signal)):
            signal_line[first_valid + i] = valid_signal[i]

        # Calculate Histogram
        for i in range(n):
            if macd_line[i] is not None and signal_line[i] is not None:
                hist[i] = round(macd_line[i] - signal_line[i], 4)

        return macd_line, signal_line, hist

    @staticmethod
    def bollinger_bands(data: list[float], period: int = 20, std_dev: float = 2.0) -> tuple[list[float | None], list[float | None], list[float | None]]:
        upper = [None] * len(data)
        middle = [None] * len(data)
        lower = [None] * len(data)
        
        if len(data) < period:
            return upper, middle, lower
            
        sma_val = TechnicalIndicators.sma(data, period)
        
        for i in range(period - 1, len(data)):
            window = data[i - period + 1 : i + 1]
            mean = sma_val[i]
            variance = sum((x - mean) ** 2 for x in window) / period
            std = math.sqrt(variance)
            
            middle[i] = mean
            upper[i] = round(mean + std_dev * std, 4)
            lower[i] = round(mean - std_dev * std, 4)
            
        return upper, middle, lower

    @staticmethod
    def atr(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> list[float | None]:
        res = [None] * len(closes)
        if len(closes) <= period:
            return res
            
        tr = [0.0] * len(closes)
        for i in range(1, len(closes)):
            h = highs[i]
            l = lows[i]
            prev_c = closes[i - 1]
            tr[i] = max(h - l, abs(h - prev_c), abs(l - prev_c))
            
        # Initial ATR (SMA of TR)
        atr_val = sum(tr[1 : period + 1]) / period
        res[period] = round(atr_val, 4)
        
        for i in range(period + 1, len(closes)):
            atr_val = (res[i - 1] * (period - 1) + tr[i]) / period
            res[i] = round(atr_val, 4)
            
        return res

    @staticmethod
    def vwap(highs: list[float], lows: list[float], closes: list[float], volumes: list[float]) -> list[float]:
        res = []
        cum_pv = 0.0
        cum_v = 0.0
        for i in range(len(closes)):
            typ_price = (highs[i] + lows[i] + closes[i]) / 3.0
            cum_pv += typ_price * volumes[i]
            cum_v += volumes[i]
            res.append(round(cum_pv / cum_v, 4) if cum_v > 0 else closes[i])
        return res

    @staticmethod
    def obv(closes: list[float], volumes: list[float]) -> list[float]:
        res = [0.0] * len(closes)
        if not closes:
            return res
            
        res[0] = volumes[0]
        for i in range(1, len(closes)):
            if closes[i] > closes[i - 1]:
                res[i] = res[i - 1] + volumes[i]
            elif closes[i] < closes[i - 1]:
                res[i] = res[i - 1] - volumes[i]
            else:
                res[i] = res[i - 1]
        return res

    @staticmethod
    def adx(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> tuple[list[float | None], list[float | None], list[float | None]]:
        n = len(closes)
        adx_list = [None] * n
        plus_di = [None] * n
        minus_di = [None] * n

        if n <= period:
            return adx_list, plus_di, minus_di

        tr = [0.0] * n
        plus_dm = [0.0] * n
        minus_dm = [0.0] * n

        for i in range(1, n):
            up_move = highs[i] - highs[i - 1]
            down_move = lows[i - 1] - lows[i]
            
            if up_move > down_move and up_move > 0:
                plus_dm[i] = up_move
            else:
                plus_dm[i] = 0.0
                
            if down_move > up_move and down_move > 0:
                minus_dm[i] = down_move
            else:
                minus_dm[i] = 0.0

            tr[i] = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))

        # Smoothed TR, +DM, -DM
        smoothed_tr = sum(tr[1 : period + 1])
        smoothed_plus_dm = sum(plus_dm[1 : period + 1])
        smoothed_minus_dm = sum(minus_dm[1 : period + 1])

        # First DI values
        plus_di[period] = round(100.0 * (smoothed_plus_dm / smoothed_tr), 4) if smoothed_tr > 0 else 0.0
        minus_di[period] = round(100.0 * (smoothed_minus_dm / smoothed_tr), 4) if smoothed_tr > 0 else 0.0
        
        dx = [0.0] * n
        denom = plus_di[period] + minus_di[period]
        dx[period] = 100.0 * abs(plus_di[period] - minus_di[period]) / denom if denom > 0 else 0.0

        for i in range(period + 1, n):
            smoothed_tr = smoothed_tr - (smoothed_tr / period) + tr[i]
            smoothed_plus_dm = smoothed_plus_dm - (smoothed_plus_dm / period) + plus_dm[i]
            smoothed_minus_dm = smoothed_minus_dm - (smoothed_minus_dm / period) + minus_dm[i]

            plus_di[i] = round(100.0 * (smoothed_plus_dm / smoothed_tr), 4) if smoothed_tr > 0 else 0.0
            minus_di[i] = round(100.0 * (smoothed_minus_dm / smoothed_tr), 4) if smoothed_tr > 0 else 0.0

            denom = plus_di[i] + minus_di[i]
            dx[i] = 100.0 * abs(plus_di[i] - minus_di[i]) / denom if denom > 0 else 0.0

        # Calculate ADX (SMA of DX)
        adx_sum = sum(dx[period : 2 * period])
        adx_list[2 * period - 1] = round(adx_sum / period, 4)

        for i in range(2 * period, n):
            adx_sum = adx_sum - dx[i - period] + dx[i]
            adx_list[i] = round(adx_sum / period, 4)

        return adx_list, plus_di, minus_di

    @staticmethod
    def stochastic_rsi(rsi_values: list[float | None], period: int = 14, k: int = 3, d: int = 3) -> tuple[list[float | None], list[float | None]]:
        n = len(rsi_values)
        stoch_k = [None] * n
        stoch_d = [None] * n

        # Find where RSI becomes valid
        first_valid = next((i for i, val in enumerate(rsi_values) if val is not None), -1)
        if first_valid == -1 or n - first_valid < period:
            return stoch_k, stoch_d

        raw_stoch_rsi = [None] * n
        for i in range(first_valid + period - 1, n):
            window = [x for x in rsi_values[i - period + 1 : i + 1] if x is not None]
            if len(window) < period:
                continue
            min_rsi = min(window)
            max_rsi = max(window)
            diff = max_rsi - min_rsi
            if diff == 0.0:
                raw_stoch_rsi[i] = 0.5
            else:
                raw_stoch_rsi[i] = (rsi_values[i] - min_rsi) / diff

        # Calculate K (SMA of raw_stoch_rsi)
        valid_stoch = [x for x in raw_stoch_rsi if x is not None]
        k_values = TechnicalIndicators.sma(valid_stoch, k)

        k_idx = 0
        for i in range(n):
            if raw_stoch_rsi[i] is not None:
                if k_idx < len(k_values):
                    stoch_k[i] = k_values[k_idx]
                    k_idx += 1

        # Calculate D (SMA of K)
        valid_k = [x for x in stoch_k if x is not None]
        d_values = TechnicalIndicators.sma(valid_k, d)

        d_idx = 0
        for i in range(n):
            if stoch_k[i] is not None:
                if d_idx < len(d_values):
                    stoch_d[i] = d_values[d_idx]
                    d_idx += 1

        return stoch_k, stoch_d

    @staticmethod
    def ichimoku(highs: list[float], lows: list[float], closes: list[float]) -> tuple[list[float | None], list[float | None], list[float | None], list[float | None], list[float | None]]:
        n = len(closes)
        tenkan = [None] * n
        kijun = [None] * n
        senkou_a = [None] * n
        senkou_b = [None] * n
        chikou = [None] * n

        # Tenkan-sen (9 period)
        for i in range(8, n):
            window_h = highs[i - 8 : i + 1]
            window_l = lows[i - 8 : i + 1]
            tenkan[i] = round((max(window_h) + min(window_l)) / 2.0, 4)

        # Kijun-sen (26 period)
        for i in range(25, n):
            window_h = highs[i - 25 : i + 1]
            window_l = lows[i - 25 : i + 1]
            kijun[i] = round((max(window_h) + min(window_l)) / 2.0, 4)

        # Senkou Span A & B (plotted 26 periods ahead)
        for i in range(n):
            if i >= 25 and tenkan[i] is not None and kijun[i] is not None:
                # Plotted 26 bars ahead (in database context we can just shift them)
                if i + 26 < n:
                    senkou_a[i + 26] = round((tenkan[i] + kijun[i]) / 2.0, 4)
            if i >= 51:
                window_h = highs[i - 51 : i + 1]
                window_l = lows[i - 51 : i + 1]
                if i + 26 < n:
                    senkou_b[i + 26] = round((max(window_h) + min(window_l)) / 2.0, 4)

        # Chikou Span (26 periods behind)
        for i in range(n):
            if i + 26 < n:
                chikou[i] = closes[i + 26]

        return tenkan, kijun, senkou_a, senkou_b, chikou

    @staticmethod
    def fibonacci_retracement(highs: list[float], lows: list[float]) -> dict[str, float]:
        """Calculates Fibonacci levels based on absolute swing high and low."""
        if not highs or not lows:
            return {}
        max_price = max(highs)
        min_price = min(lows)
        diff = max_price - min_price

        # Assuming an uptrend for the retracement levels (retrace from high to low)
        return {
            "0.0": round(max_price, 4),
            "23.6": round(max_price - 0.236 * diff, 4),
            "38.2": round(max_price - 0.382 * diff, 4),
            "50.0": round(max_price - 0.500 * diff, 4),
            "61.8": round(max_price - 0.618 * diff, 4),
            "78.6": round(max_price - 0.786 * diff, 4),
            "100.0": round(min_price, 4),
        }

    @staticmethod
    def volume_profile(closes: list[float], volumes: list[float], bins: int = 10) -> list[dict]:
        """Splits the close price range into discrete bins and sums volume in each."""
        if not closes or not volumes:
            return []
            
        min_p = min(closes)
        max_p = max(closes)
        price_range = max_p - min_p
        
        if price_range == 0.0:
            return [{"price_low": min_p, "price_high": max_p, "volume": sum(volumes)}]
            
        bin_width = price_range / bins
        profile = []
        for i in range(bins):
            b_low = min_p + i * bin_width
            b_high = b_low + bin_width
            profile.append({
                "price_low": round(b_low, 2),
                "price_high": round(b_high, 2),
                "volume": 0.0
            })
            
        for price, vol in zip(closes, volumes):
            bin_idx = int((price - min_p) / bin_width)
            if bin_idx >= bins:
                bin_idx = bins - 1
            profile[bin_idx]["volume"] += vol
            
        # Round volumes
        for b in profile:
            b["volume"] = round(b["volume"], 0)
            
        return profile
