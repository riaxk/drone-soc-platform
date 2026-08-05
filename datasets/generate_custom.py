"""Generate clean flight and heavy interference test telemetry datasets."""

import random
from datetime import datetime, timedelta
import pandas as pd

PROTOCOLS = ["MAVLink", "802.11", "UDP", "TCP", "DTLS"]
ATTACK_TYPES = ["DoS", "Command Injection", "Signal Jamming", "Spoofing", "Replay Attack"]
NORMAL_IPS = ["192.168.1.100", "192.168.1.101", "192.168.1.102", "10.0.0.50"]
ATTACK_IPS = ["10.0.0.99", "172.16.0.77", "203.0.113.45", "198.51.100.22"]
NORMAL_MACS = ["AA:BB:CC:DD:EE:01", "AA:BB:CC:DD:EE:02", "AA:BB:CC:DD:EE:03"]
ATTACK_MACS = ["FF:FF:FF:FF:FF:FF", "DE:AD:BE:EF:00:01", "00:00:00:00:00:00"]


def generate_dataset(n_rows: int, attack_ratio: float) -> pd.DataFrame:
    rows = []
    base_time = datetime(2026, 7, 10, 10, 0, 0)

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
            "timestamp": (base_time + timedelta(seconds=i * 2)).isoformat(),
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
    
    # 1. Clean Flight Telemetry
    df_normal = generate_dataset(2500, 0.0)
    out_normal = os.path.join(os.path.dirname(__file__), "drone_normal_flight.csv")
    df_normal.to_csv(out_normal, index=False)
    print(f"Generated {len(df_normal)} rows -> {out_normal} (0.0% attack)")

    # 2. Heavy Jamming Interferences
    df_attack = generate_dataset(3000, 0.40)
    out_attack = os.path.join(os.path.dirname(__file__), "drone_jamming_attack.csv")
    df_attack.to_csv(out_attack, index=False)
    print(f"Generated {len(df_attack)} rows -> {out_attack} (40.0% attack)")
