# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/EmanuelAngel/pomody/compare/pomody-v0.1.0...pomody-v0.2.0) (2026-09-26)


### Features

* **domain:** task entities, repository port and local storage persistence adapter ([#22](https://github.com/EmanuelAngel/pomody/issues/22)) ([#26](https://github.com/EmanuelAngel/pomody/issues/26)) ([7d8fab6](https://github.com/EmanuelAngel/pomody/commit/7d8fab6878dabacf7d22e513c0d46b070963c664))

## 0.1.0 (2026-09-25)


### Features

* **audio:** web audio transition alerts and domain event wiring ([#7](https://github.com/EmanuelAngel/pomody/issues/7)) ([#16](https://github.com/EmanuelAngel/pomody/issues/16)) ([aa60c0c](https://github.com/EmanuelAngel/pomody/commit/aa60c0cbf06374c8d71f41c7e4943c385ea59907))
* **ci:** configure cloudflare workers static assets with wrangler ([0edade2](https://github.com/EmanuelAngel/pomody/commit/0edade2bd37a9f2047e60fb50d800a2ce92a3ff0))
* **desktop:** scaffold Tauri v2 and setup Windows executable CI workflow ([#18](https://github.com/EmanuelAngel/pomody/issues/18)) ([#19](https://github.com/EmanuelAngel/pomody/issues/19)) ([a234c35](https://github.com/EmanuelAngel/pomody/commit/a234c35cf3b17792690077a4cfa9a0efb2c62909))
* **domain:** implement timer finite state machine and transitions ([#2](https://github.com/EmanuelAngel/pomody/issues/2)) ([7a99b38](https://github.com/EmanuelAngel/pomody/commit/7a99b389f5ed978c1229f6ebc55ca26eb3a76d93)), closes [#1](https://github.com/EmanuelAngel/pomody/issues/1)
* **state:** reactive timer composition root and web worker ticker adapter ([#8](https://github.com/EmanuelAngel/pomody/issues/8)) ([a9d1e36](https://github.com/EmanuelAngel/pomody/commit/a9d1e36cdde379a8d3320291c60b5a40397b1b49))
* **storage:** persist timer settings and theme preference to local storage ([#15](https://github.com/EmanuelAngel/pomody/issues/15)) ([#17](https://github.com/EmanuelAngel/pomody/issues/17)) ([47a32b9](https://github.com/EmanuelAngel/pomody/commit/47a32b9a804b26c8ee5fe819ab7f7dea3b41baef))
* **ui:** layout shell and top navigation tabs ([#14](https://github.com/EmanuelAngel/pomody/issues/14)) ([f3092a6](https://github.com/EmanuelAngel/pomody/commit/f3092a6e06fe79be5009cabb15df0ef547249d2d))
* **ui:** minimalist timer view and zen mode controls ([#4](https://github.com/EmanuelAngel/pomody/issues/4)) ([#9](https://github.com/EmanuelAngel/pomody/issues/9)) ([0a0ffc7](https://github.com/EmanuelAngel/pomody/commit/0a0ffc7d24757b05070204c53867a102e6630906))
* **ui:** settings drawer for interval durations and theme selector ([#5](https://github.com/EmanuelAngel/pomody/issues/5)) ([#10](https://github.com/EmanuelAngel/pomody/issues/10)) ([77efed8](https://github.com/EmanuelAngel/pomody/commit/77efed877fcdef429420619eb4aab9dd1718dc1b))


### Bug Fixes

* **ci:** declare workspace packages and add spa redirects for cloudflare ([fe967c3](https://github.com/EmanuelAngel/pomody/commit/fe967c31ef9938728fca562945f68a05b6020dee))
* **ci:** ignore CHANGELOG.md in prettier and bind tauri version to package.json ([a5198a1](https://github.com/EmanuelAngel/pomody/commit/a5198a1152f9d37f1c8b98c7d6729c6566efbc9a))
* **ci:** remove redundant _redirects for workers static assets ([4bee0a5](https://github.com/EmanuelAngel/pomody/commit/4bee0a5c76762b45cb5a968934b3f6a01880fdf8))
* **ci:** set release please manifest baseline to 0.0.0 for initial v0.1.0 release ([1377207](https://github.com/EmanuelAngel/pomody/commit/1377207245fef6510b14cabd755164177454365e))


### Miscellaneous Chores

* release 0.1.0 ([01440a0](https://github.com/EmanuelAngel/pomody/commit/01440a04a1e4ae46c2ee6075a49de50e9c93c035))

## [Unreleased]
