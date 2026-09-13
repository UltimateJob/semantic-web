# semantic-web: reproducible platform builds

## Versions, tools and build layout

The glibc installer pins component tag **v0.5.0-insightos.2026.2** at `26d0536fab98a256b0540ffb760ff35ab2a8dbf1`.
This guide pins the current build-script snapshot at `69baf06d294813a9a4eda9eb70ea1a9a94feba85`.
To reconstruct another published release, read its `release.json` and select
both `source_commit` and `build_recipe_commit`; a source tag alone may predate
the CI scripts. This recipe reproduces the build steps, not historical archive bytes.

Prerequisites: Node.js 22 and npm, Python 3 and Git. `npm ci` uses the committed package-lock.json.

The release scripts expect **two sibling checkouts**, `automation/` for build
scripts and `source/` for the component. Run these commands from a fresh working
directory (the scripts themselves are not standalone copies):

```bash
REPRO_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/semantic-web-repro.XXXXXXXX")"
git clone --no-checkout https://github.com/insightos-community/semantic-web.git "$REPRO_ROOT/automation"
GIT_LFS_SKIP_SMUDGE=1 git -C "$REPRO_ROOT/automation" checkout --detach 69baf06d294813a9a4eda9eb70ea1a9a94feba85
git clone --no-checkout https://github.com/insightos-community/semantic-web.git "$REPRO_ROOT/source"
GIT_LFS_SKIP_SMUDGE=1 git -C "$REPRO_ROOT/source" checkout --detach v0.5.0-insightos.2026.2
cd "$REPRO_ROOT/source"
test "$(git rev-parse HEAD)" = 26d0536fab98a256b0540ffb760ff35ab2a8dbf1
export TARGET_TAG=v0.5.0-insightos.2026.2
export COMPONENT=semantic-web
export GITHUB_SHA=69baf06d294813a9a4eda9eb70ea1a9a94feba85
```

## Linux glibc / standard component Release

The executable build entry is [`.github/scripts/build.sh`](.github/scripts/build.sh);
archive validation is [`.github/scripts/package.py`](.github/scripts/package.py).
From `source/` in the layout above:

```bash
bash ../automation/.github/scripts/build.sh
python3 ../automation/.github/scripts/package.py semantic-web
(cd .output/release && sha256sum -c SHA256SUMS)
```

Artifacts: `source/.output/release/` (archives/wheels, `release.json`, checksum
inventory and license notices). `release.json` records source and recipe revisions.
The local commands do not publish or overwrite a GitHub Release.

## Linux musl

This component produces pure Python wheels, scripts, static Web/docs or assets
that are reused by the musl installer. Reproduce the component on the standard
build host above; a second musl compilation of those same files is unnecessary.
Native transitive dependencies must still be obtained from the musl lock.

For the complete musl build and offline checks, use the [quick-start musl commands](https://github.com/insightos-community/quick-start/blob/main/README.build.md#linux-musl-x86_64).

## macOS / macosx

The production Web output is platform-independent. With Node.js 22 on a
native Mac, the same npm lock and fixture-disabled build are used:

```bash
npm ci
npm test -- --maxWorkers=2 --minWorkers=1
VITE_STUDIO_FIXTURES=false VITE_DEVICE_FIXTURES=false npm run build
```

Output: `dist/`. Native servers and the Web gateway are separate macOS binaries.

The complete macOS installer targets Apple Silicon/macOS 15.5+; see the [locked assembly instructions](https://github.com/insightos-community/quick-start/blob/main/README.build.md#macos-apple-silicon).

## GitHub workflow reproduction

The repository’s [CI workflow](.github/workflows/ci.yml) implements the two-checkout
layout. To build a source tag without publishing, create a reproduction branch at the
pinned automation commit. GitHub dispatch expects a branch/tag ref; both tag refs
and default-branch dispatches can enter this workflow’s publishing job. The following
commands require repository write access and use a non-default branch:

```bash
gh auth setup-git
REPRO_BRANCH=reproduce/platform-builds
git -C "$REPRO_ROOT/automation" push origin 69baf06d294813a9a4eda9eb70ea1a9a94feba85:refs/heads/$REPRO_BRANCH
gh workflow run ci.yml --repo insightos-community/semantic-web --ref "$REPRO_BRANCH" -f tag=v0.5.0-insightos.2026.2
gh run list --repo insightos-community/semantic-web --workflow ci.yml --limit 5
# Set REPRO_RUN_ID to the selected run ID.
gh run watch "$REPRO_RUN_ID" --repo insightos-community/semantic-web --exit-status
gh run download "$REPRO_RUN_ID" --repo insightos-community/semantic-web --name release-assets --dir downloaded-release
```

## Reproduction evidence

Build in a fresh checkout and a separate output directory for each ABI. Preserve
source commits, compiler/tool versions, dependency locks, package inventories and
test logs. Fixed source revisions and a container digest reproduce the recipe;
unlocked OS packages, runner images, timestamps and build tools can still change
archive bytes. Compare a downloaded release against its published `SHA256SUMS`;
do not expect a local rebuild to have the same digest.

See the [complete installer and repository index](https://github.com/insightos-community/quick-start/blob/main/README.build.md) for assembly order,
platform locks and end-to-end validation. Local build commands do not publish a
Release. Publishing requires repository write access and a new version tag;
existing release tags/assets should not be replaced.
