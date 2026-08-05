"""ML module configuration."""
FEATURE_COLUMNS = ["packet_size", "time_delay", "transmission_rate"]
TARGET_COLUMN = "is_attack"
TEST_SIZE = 0.2
RANDOM_STATE = 42
DEFAULT_MODEL_TYPE = "RandomForest"
DEFAULT_N_ESTIMATORS = 50

CSV_COLUMN_MAP = {
    "timestamp": "timestamp",
    "source_ip": "source_ip",
    "dest_ip": "dest_ip",
    "destination_ip": "dest_ip",
    "protocol": "protocol",
    "packet_size": "packet_size",
    "time_delay": "time_delay",
    "transmission_rate": "transmission_rate",
    "mac_address": "mac_address",
    "is_attack": "is_attack",
    "attack_type": "attack_type",
    "attack_label": "is_attack",
}
