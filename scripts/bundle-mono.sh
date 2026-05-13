#!/usr/bin/env bash
set -e

MONO_REPO="https://download.mono-project.com/repo/ubuntu/pool/main/m/mono"
VERSION="6.12.0.182"
DIST="debian10b1"

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TARGET="$SCRIPT_DIR/../resources/mono"
mkdir -p "$TARGET"

# Core runtime
CORE_RUNTIMES=(
  "mono-runtime-common_${VERSION}-0xamarin1+${DIST}_amd64.deb"
  "mono-runtime-sgen_${VERSION}-0xamarin1+${DIST}_amd64.deb"
)

# Essential CIL libs for Vintage Story 1.17
CIL_LIBS=(
  "libmono-corlib4.5-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-core4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-numerics4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-xml4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-data4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-drawing4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-net-http4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-web4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-web-services4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-security4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-configuration4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-io-compression4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-runtime4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-json4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-runtime-serialization4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-identitymodel4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-servicemodel4.0a-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-microsoft-build4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-i18n4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-posix4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-security4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-windowsbase4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-system-windows-forms4.0-cil_${VERSION}-0xamarin1+${DIST}_all.deb"
  "libmono-btls-interface4.0-cil_${VERSION}-0xamarin1+${DIST}_amd64.deb"
)

cd "$TARGET"

process_package() {
  local pkg="$1"
  echo "Processing $pkg..."
  curl -sL "$MONO_REPO/$pkg" -o "$pkg"

  if ! ar t "$pkg" > /dev/null 2>&1; then
    echo "WARNING: $pkg is not a valid deb package, skipping."
    rm -f "$pkg"
    return
  fi

  mkdir -p "$pkg.d"
  (cd "$pkg.d" && ar x ../"$pkg")
  
  local data_tar
  data_tar=$(find "$pkg.d" -name 'data.tar*' | head -n 1)
  if [ -n "$data_tar" ]; then
    tar xf "$data_tar"
  else
    echo "WARNING: No data archive found in $pkg"
  fi
  rm -rf "$pkg.d" "$pkg"
}

# Download and extract core runtime packages
for pkg in "${CORE_RUNTIMES[@]}"; do
  process_package "$pkg"
done

# Download and extract CIL library packages
for pkg in "${CIL_LIBS[@]}"; do
  process_package "$pkg"
done

# Show what we got
echo ""
echo "===== Mono bundle summary ====="
echo "Libraries:"
find "$TARGET" -name '*.so*' | sort | wc -l | xargs echo "  Shared libraries:"
echo ""
echo "CIL assemblies:"
find "$TARGET" -name '*.dll' | sort | head -n 30 | sed 's/^/  /'
DLL_COUNT=$(find "$TARGET" -name '*.dll' | wc -l)
echo "  ... total DLLs: $DLL_COUNT"
echo ""
echo "Mono binary:"
if [ -f "$TARGET/usr/bin/mono-sgen" ]; then
  echo "  /usr/bin/mono-sgen exists ✓"
  ls -lh "$TARGET/usr/bin/mono-sgen"
else
  echo "  WARNING: /usr/bin/mono-sgen not found!"
fi
echo ""
echo "Mono config:"
if [ -f "$TARGET/etc/mono/config" ]; then
  echo "  /etc/mono/config exists ✓"
else
  echo "  WARNING: /etc/mono/config not found!"
fi
echo ""
echo "Bundle size:"
du -sh "$TARGET"
echo ""
echo "Done! Mono bundle ready for AppImage."
