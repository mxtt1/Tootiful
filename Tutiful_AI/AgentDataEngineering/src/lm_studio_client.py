"""
Lightweight LM Studio client tailored for local Mistral-style chat endpoints.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import requests


class LMStudioClientError(Exception):
    """Base exception for LM Studio client issues."""


class LMStudioUnavailableError(LMStudioClientError):
    """Raised when the LM Studio server cannot be reached."""


class LMStudioClient:
    """Simple wrapper around the LM Studio chat completions endpoint."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:1234",
        model: str = "mistral-7b-instruct-v0.3",
        timeout: int = 120,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.logger = logging.getLogger(self.__class__.__name__)

    @property
    def chat_url(self) -> str:
        return f"{self.base_url}/v1/chat/completions"

    def is_available(self) -> bool:
        """Best-effort health check."""
        try:
            response = requests.get(f"{self.base_url}/v1/models", timeout=3)
            if response.status_code == 200:
                return True
            self.logger.debug("LM Studio health probe returned %s", response.status_code)
            return False
        except requests.RequestException as exc:
            self.logger.debug("LM Studio health probe failed: %s", exc)
            return False

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 800,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, bool]:
        """
        Send a chat completion request.

        Returns the content (or an empty string on failure) and whether the model was used.
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            response = requests.post(self.chat_url, json=payload, timeout=self.timeout)
            if response.status_code == 400 and response_format:
                self.logger.debug("LM Studio rejected response_format request: %s", response.text)
                payload.pop("response_format", None)
                response = requests.post(self.chat_url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return content.strip(), True
        except requests.RequestException as exc:
            self.logger.warning("LM Studio chat failed: %s", exc)
            return "", False
        except (KeyError, IndexError) as exc:
            self.logger.warning("Unexpected LM Studio payload: %s", exc)
            return "", False
