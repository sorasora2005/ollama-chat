"""Centralized logging configuration for the application"""
import logging
import sys
from pathlib import Path

# Create logs directory
LOGS_DIR = Path("/app/logs")
try:
    LOGS_DIR.mkdir(exist_ok=True)
except (PermissionError, OSError):
    # Fallback to local directory if /app/logs isn't writable
    LOGS_DIR = Path("./logs")
    LOGS_DIR.mkdir(exist_ok=True)


def setup_logging(
    log_level: str = "INFO",
    log_file: str = "app.log"
) -> logging.Logger:
    """
    Configure application logging with both file and console handlers

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Name of the log file

    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger("ollama_chat")
    logger.setLevel(getattr(logging, log_level.upper()))

    # Prevent duplicate handlers
    if logger.handlers:
        return logger

    # Console handler - INFO and above
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)

    # File handler - DEBUG and above
    file_handler = logging.FileHandler(LOGS_DIR / log_file)
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_format)

    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger


def get_logger(name: str = "ollama_chat") -> logging.Logger:
    """
    Get a logger instance

    Args:
        name: Logger name (typically __name__ of the calling module)

    Returns:
        Logger instance
    """
    return logging.getLogger(name)
