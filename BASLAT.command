#!/bin/bash
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  python3 BASLAT.py
else
  echo "Bu bilgisayarda Python 3 bulunamadi. ONCE_OKU.txt dosyasini okuyun."
fi
read -r -p "Pencereyi kapatmak icin Enter: "
