"""Generate sample drone network traffic dataset."""

import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

PROTOCOLS = ["MAVLink", "802.11", "UDP", "TCP", "DTLS"]
ATTACK_TYPES = ["DoS", "Command Injection", "Signal Jamming", "Spoofing", "Replay Attack"]
NORMAL_IPS = ["192.168.1.100", "192.168.1.101", "192.168.1.102", "10.0.0.50"]
ATTACK_IPS = ["10.0.0.99", "172.16.0.77", "203.0.113.45", "198.51.100.22"]
NORMAL_MACS = ["AA:BB:CC:DD:EE:01", "AA:BB:CC:DD:EE:02", "AA:BB:CC:DD:EE:03"]
ATTACK_MACS = ["FF:FF:FF:FF:FF:FF", "DE:AD:BE:EF:00:01", "00:00:00:00:00:00"]


def generate(n_rows: int = 5000, attack_ratio: float = 0.15) -> pd.DataFrame:
    rows = []
    base_time = datetime(2026, 7, 10, 8, 0, 0)

    for i in range(n_rows):
        is_attack = random.random() < attack_ratio

        if is_attack:
            packet_size = random.randint(8000, 65535)
            time_delay = round(random.uniform(200, 2000), 2)
            transmission_rate = round(random.uniform(10, 200), 2)
            source_ip = random.choice(ATTACK_IPS)
            mac = random.choice(ATTACK_MACS)
            attack_type = random.choice(ATTACK_TYPES)
        else:
            packet_size = random.randint(128, 1500)
            time_delay = round(random.uniform(5, 80), 2)
            transmission_rate = round(random.uniform(500, 5000), 2)
            source_ip = random.choice(NORMAL_IPS)
            mac = random.choice(NORMAL_MACS)
            attack_type = "normal"

        rows.append({
            "timestamp": (base_time + timedelta(seconds=i * 3)).isoformat(),
            "source_ip": source_ip,
            "dest_ip": "192.168.1.1",
            "protocol": random.choice(PROTOCOLS),
            "packet_size": packet_size,
            "time_delay": time_delay,
            "transmission_rate": transmission_rate,
            "mac_address": mac,
            "is_attack": int(is_attack),
            "attack_type": attack_type,
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    import os
    df = generate(5000)
    out = os.path.join(os.path.dirname(__file__), "drone_network_data.csv")
    df.to_csv(out, index=False)
    print(f"Generated {len(df)} rows -> {out}")
    print(f"Attack ratio: {df['is_attack'].mean():.2%}")
