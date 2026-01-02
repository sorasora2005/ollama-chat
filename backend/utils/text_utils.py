"""Text manipulation utilities"""


def truncate_with_ellipsis(text: str, max_length: int = 50) -> str:
    """
    Truncate text and add ellipsis if needed

    Args:
        text: Text to truncate
        max_length: Maximum length before truncation

    Returns:
        Truncated text with ellipsis if needed
    """
    if not text:
        return ""

    if len(text) <= max_length:
        return text

    return text[:max_length] + "..."
