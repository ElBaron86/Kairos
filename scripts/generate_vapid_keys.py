"""Génère une paire de clés VAPID pour les notifications Web Push de Kairos.

La clé privée ne doit être copiée que dans les secrets Supabase
(Edge Functions → Secrets → ``VAPID_PRIVATE_KEY``). La clé publique va dans
``VAPID_PUBLIC_KEY`` côté Supabase et dans l'application.

Usage
-----
    pip install cryptography
    python scripts/generate_vapid_keys.py
"""

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    """Encode des octets en base64 « URL-safe » sans remplissage.

    Parameters
    ----------
    data : bytes
        Octets à encoder.

    Returns
    -------
    str
        Chaîne base64url sans caractères ``=`` finaux, format attendu par Web Push.
    """
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def generate_vapid_keys() -> tuple[str, str]:
    """Crée une paire de clés VAPID sur la courbe P-256.

    Returns
    -------
    public_key : str
        Clé publique (point non compressé de 65 octets), encodée en base64url.
    private_key : str
        Clé privée (scalaire de 32 octets), encodée en base64url.

    Notes
    -----
    Ce format brut est celui qu'utilisent la bibliothèque ``web-push`` et l'API
    ``PushManager.subscribe`` des navigateurs.
    """
    key = ec.generate_private_key(ec.SECP256R1())
    private_bytes = key.private_numbers().private_value.to_bytes(32, "big")
    public_bytes = key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return b64url(public_bytes), b64url(private_bytes)


def main() -> None:
    """Affiche une nouvelle paire de clés à copier dans Supabase.

    Returns
    -------
    None
    """
    public_key, private_key = generate_vapid_keys()
    print("VAPID_PUBLIC_KEY  =", public_key)
    print("VAPID_PRIVATE_KEY =", private_key)
    print("\nGardez la clé privée secrète : ne la partagez avec personne.")


if __name__ == "__main__":
    main()
