# ARTIFACT_REGISTRY_INVESTIGATION — psych-dev-site-prod

Дата анализа (UTC): 2026-01-17T09:03:29Z

## 1) Краткое резюме

- В проекте есть два репозитория Artifact Registry: `gcf-artifacts` в `europe-west1` и `us-central1`; сканирование включено (SCANNING_ACTIVE).
- Размеры репозиториев по `sizeBytes`: europe-west1 — 990.04 MiB, us-central1 — 572.14 MiB (фактический billable storage может отличаться из-за дедупликации слоёв).
- В europe-west1 основную массу занимает пакет `psych--dev--site--prod__europe--west1__ingest_book` (25 digest'ов, 1.04 GiB виртуально) и один cache-образ (150.96 MiB).
- В us-central1 6 образов/кэшей (по 1 digest каждый); суммарно 1.22 GiB виртуально, но repo size существенно меньше из-за общих слоёв.
- Cloud Run (ingestbook) использует 25 digest'ов из `ingest_book`; это объясняет, почему большинство digest'ов помечены как 'used'.
- Непривязанные к Cloud Run/Functions digest'ы существуют (7 шт., 1.36 GiB виртуально), но все они **tagged**; критерий 'untagged + unused + старше 14/30 дней' не выполнен.

Примечание: `imageSizeBytes` отражает виртуальный размер образа; фактическое billed storage может быть меньше из-за шаринга слоёв и дедупликации. В отчёте все расчёты размеров сделаны по `imageSizeBytes` для единого подхода.

## 2) Репозитории Artifact Registry

| name | location | format | mode | sizeBytes | createTime | scanning | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| projects/psych-dev-site-prod/locations/europe-west1/repositories/gcf-artifacts | europe-west1 | DOCKER | STANDARD_REPOSITORY | 990.04 MiB | 2025-12-21T20:36:01Z | SCANNING_ACTIVE (since 2025-12-21T20:35:52Z) | This repository is created and used by Cloud Functions for storing function docker images. |
| projects/psych-dev-site-prod/locations/us-central1/repositories/gcf-artifacts | us-central1 | DOCKER | STANDARD_REPOSITORY | 572.14 MiB | 2025-10-20T19:57:28Z | SCANNING_ACTIVE (since 2025-10-20T19:57:14Z) | This repository is created and used by Cloud Functions for storing function docker images. |

## 3) Сводка по gcf-artifacts (пакеты/образы)

### europe-west1/gcf-artifacts

| package | digests | total size | oldest | newest | untagged (count/size) | >7d (count/size) | >14d (count/size) | >30d (count/size) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book | 25 | 1.04 GiB | 2025-12-21 | 2026-01-07 | 24 / 1.02 GiB | 25 / 1.04 GiB | 22 / 1003.20 MiB | 0 / 0.00 MiB |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache | 1 | 150.96 MiB | 2025-12-23 | 2025-12-23 | 0 / 0.00 MiB | 1 / 150.96 MiB | 1 / 150.96 MiB | 0 / 0.00 MiB |

### us-central1/gcf-artifacts

| package | digests | total size | oldest | newest | untagged (count/size) | >7d (count/size) | >14d (count/size) | >30d (count/size) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin | 1 | 412.13 MiB | 2026-01-07 | 2026-01-07 | 0 / 0.00 MiB | 1 / 412.13 MiB | 0 / 0.00 MiB | 0 / 0.00 MiB |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin/cache | 1 | 150.96 MiB | 2025-12-23 | 2025-12-23 | 0 / 0.00 MiB | 1 / 150.96 MiB | 1 / 150.96 MiB | 0 / 0.00 MiB |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/migrate_admins/cache | 1 | 119.37 MiB | 2025-12-22 | 2025-12-22 | 0 / 0.00 MiB | 1 / 119.37 MiB | 1 / 119.37 MiB | 0 / 0.00 MiB |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role | 1 | 412.13 MiB | 2026-01-07 | 2026-01-07 | 0 / 0.00 MiB | 1 / 412.13 MiB | 0 / 0.00 MiB | 0 / 0.00 MiB |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role/cache | 1 | 75.48 MiB | 2026-01-07 | 2026-01-07 | 0 / 0.00 MiB | 1 / 75.48 MiB | 0 / 0.00 MiB | 0 / 0.00 MiB |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/update_course_access/cache | 1 | 75.48 MiB | 2026-01-07 | 2026-01-07 | 0 / 0.00 MiB | 1 / 75.48 MiB | 0 / 0.00 MiB | 0 / 0.00 MiB |

## 4) Топ-10 самых больших digest’ов по каждому репозиторию

### europe-west1/gcf-artifacts

| image@digest | size | created | tags |
| --- | --- | --- | --- |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache@sha256:863a4630e57d8be37543c27c72168ee46f3598cc0bae9a2c9f9adafb6c712f3a | 150.96 MiB | 2025-12-23 | latest |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 | 65.59 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f | 65.57 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a212a74ec2368e662d7013761c45c3f7f35379dc5f5ff7f1f27b45d67d7d672a | 65.57 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:12a50989dfaea5af2083df878e85e08322207c52d30d0075e435cb8036bb1786 | 65.56 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:27f1678fcb369e02cae0ea9c151a30d128872e9f3e7b3c3ec913284005eda7cf | 65.56 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:3b488da81a375222dc1bd5cb7a5cafed6bb5b4b2f953310859eddd1c5b53b634 | 65.56 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:70b115dccaa056efd9656e65b299cb6a955977a2dfb458e4195ce9d9d98e7957 | 65.55 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a319a9c6140ad114446dbb89b7671b5ec50af0e4681bb2295780381dc500d3ca | 65.55 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:63f87f90977c7704272a84ecd3af1a18bb8253446ad1c8ed8bbd6159e3b3426e | 65.55 MiB | 2025-12-21 | - |

### us-central1/gcf-artifacts

| image@digest | size | created | tags |
| --- | --- | --- | --- |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin@sha256:aeaa5069df4a58bf831e8614edf343b86ea35f657d7c55f1654ad6ccd09a9d12 | 412.13 MiB | 2026-01-07 | latest,version_23 |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role@sha256:8b3935eec4a6d3ca8d78039ddfdd246260ac389734d64d8b7edac300b043cb98 | 412.13 MiB | 2026-01-07 | latest,version_1 |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin/cache@sha256:3ad82538bd37533b4bfad130dd2e97276b95549e0499de8cb1724b4d3dc08ef2 | 150.96 MiB | 2025-12-23 | latest |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/migrate_admins/cache@sha256:ef790273bc3fcab1752d405fa5c9f45d6870288b52ec4d8e988d7bed0912ef68 | 119.37 MiB | 2025-12-22 | latest |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/update_course_access/cache@sha256:5e591e8bb2ec160ff78b6e1d78c335fde2a23cd17300b680151443b3d78ed6ba | 75.48 MiB | 2026-01-07 | latest |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role/cache@sha256:7a10a218063353eb8221b001cc03c32437896e3d9f8a49a3a314b7a463708e2f | 75.48 MiB | 2026-01-07 | latest |

## 5) Используемые образы

### Cloud Run (managed)

- Сервис: `ingestbook` (region: `europe-west1`)
- Всего ревизий: 25; трафик направлен на последнюю ревизию.
- Других Cloud Run сервисов в проекте не обнаружено по `gcloud run services list`.

| revision | created (UTC) | image@digest | traffic |
| --- | --- | --- | --- |
| ingestbook-00025-mof | 2026-01-07T23:22:49Z | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:af0726f4d88b01983937673b42fb99ca8adde9f5aaef7345e3ae9aa29610843b | yes |
| ingestbook-00024-qex | 2026-01-07T23:19:15Z | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0f5807422c3c58b792a324e991cbdf3b1ef6fdf58a7688de6f47419d29b8ea00 |  |
| ingestbook-00023-lew | 2026-01-07T13:25:19Z | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:7465bbd7ea69da6c72dfb5a8c0834683bb2ccf95968e110ebebf3b2bf5f4b2cc |  |
| ingestbook-00022-deh | 2025-12-25T12:50:34Z | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:053efcdc02c44a9f7aee1e681d6c9a53377d75ecf5f0f6a7a7e692be10fd0b17 |  |
| ingestbook-00021-mur | 2025-12-25T09:27:06Z | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f39bc06cf5b2248644c0ce7398c35417ea479078ad7b736cad185816b26911b4 |  |

### Cloud Functions (2nd gen)

| function | region | service | revision | image@digest |
| --- | --- | --- | --- | --- |
| projects/psych-dev-site-prod/locations/europe-west1/functions/ingestBook | europe-west1 | projects/psych-dev-site-prod/locations/europe-west1/services/ingestbook | ingestbook-00025-mof | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:af0726f4d88b01983937673b42fb99ca8adde9f5aaef7345e3ae9aa29610843b |

В `gcloud functions list --v2` также видны функции GEN_1 в `us-central1`; они не используют Artifact Registry и не дают image digest’ы.

### Dedup список digest’ов в использовании

Всего digest’ов в использовании: 25

| image@digest | size | created | tags |
| --- | --- | --- | --- |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:053efcdc02c44a9f7aee1e681d6c9a53377d75ecf5f0f6a7a7e692be10fd0b17 | 21.65 MiB | 2025-12-25 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0f5807422c3c58b792a324e991cbdf3b1ef6fdf58a7688de6f47419d29b8ea00 | 21.66 MiB | 2026-01-07 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0ff6ed011889b34de3dfc17f16016209abc95d837b730276cce4f35d27867f11 | 21.65 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:12a50989dfaea5af2083df878e85e08322207c52d30d0075e435cb8036bb1786 | 65.56 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:24919195eae3a7ecba8fc62ae487c4d7615114d958eaa519b8fcd668d4a1831b | 21.65 MiB | 2025-12-24 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:27f1678fcb369e02cae0ea9c151a30d128872e9f3e7b3c3ec913284005eda7cf | 65.56 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:2d7d2283557e4f715f87cbba8ed470a7fb5b46262e1c3ab65a76bada6331e1f9 | 21.65 MiB | 2025-12-24 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:3b488da81a375222dc1bd5cb7a5cafed6bb5b4b2f953310859eddd1c5b53b634 | 65.56 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5ae58db9c0938328a5fe168ae6813e209644760e7c70df2bc3e513957e78e5d4 | 65.55 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5db0df7b1b144686d75f66449a90fccadf09978847bc04a2e9da3fb5baff17d8 | 65.55 MiB | 2025-12-22 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:63f87f90977c7704272a84ecd3af1a18bb8253446ad1c8ed8bbd6159e3b3426e | 65.55 MiB | 2025-12-21 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:66501e33c72e794ef7cee8bc7e22e0398421b4474c2c3a2ba6fe5921fd64d531 | 21.64 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:70b115dccaa056efd9656e65b299cb6a955977a2dfb458e4195ce9d9d98e7957 | 65.55 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:7465bbd7ea69da6c72dfb5a8c0834683bb2ccf95968e110ebebf3b2bf5f4b2cc | 21.66 MiB | 2026-01-07 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:809683953a44f476e5a79e8d85c088d492cbc5e756e6f60ef5226a4327932344 | 21.65 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:974cb45a8a436dfc0cbf7a37be7ac559520082346e521d104533f700c7da6a94 | 21.65 MiB | 2025-12-24 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a212a74ec2368e662d7013761c45c3f7f35379dc5f5ff7f1f27b45d67d7d672a | 65.57 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a319a9c6140ad114446dbb89b7671b5ec50af0e4681bb2295780381dc500d3ca | 65.55 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a3fec53f7ba4da57284232d96d72e32075fa278cf109367775c91fecb3008c7a | 65.55 MiB | 2025-12-22 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:af0726f4d88b01983937673b42fb99ca8adde9f5aaef7345e3ae9aa29610843b | 21.66 MiB | 2026-01-07 | latest,version_1 |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:b77e566bb354bf5f4ef523496f74e6dd7c4c16132a8d9fc46f0a56584ed03a79 | 21.65 MiB | 2025-12-24 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 | 65.59 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f | 65.57 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f39bc06cf5b2248644c0ce7398c35417ea479078ad7b736cad185816b26911b4 | 21.65 MiB | 2025-12-25 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f8980fb9cb9f31633edfa58a429b0ece176f09694bbacbb99d1e2cbfd757627b | 21.65 MiB | 2025-12-24 | - |

## 6) Кандидаты на очистку (без удаления)

- Критерий: untagged + unused + старше 14 дней.
  - Нет кандидатов, подходящих под критерий.

- Критерий: untagged + unused + старше 30 дней.
  - Нет кандидатов, подходящих под критерий.

Дополнительно (не соответствует критерию untagged, но не используется по Cloud Run/Functions):
- Tagged + unused digest’ы: 7 шт., 1.36 GiB виртуально
| image@digest | size | created | tags |
| --- | --- | --- | --- |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache@sha256:863a4630e57d8be37543c27c72168ee46f3598cc0bae9a2c9f9adafb6c712f3a | 150.96 MiB | 2025-12-23 | latest |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin@sha256:aeaa5069df4a58bf831e8614edf343b86ea35f657d7c55f1654ad6ccd09a9d12 | 412.13 MiB | 2026-01-07 | latest,version_23 |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin/cache@sha256:3ad82538bd37533b4bfad130dd2e97276b95549e0499de8cb1724b4d3dc08ef2 | 150.96 MiB | 2025-12-23 | latest |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/migrate_admins/cache@sha256:ef790273bc3fcab1752d405fa5c9f45d6870288b52ec4d8e988d7bed0912ef68 | 119.37 MiB | 2025-12-22 | latest |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role@sha256:8b3935eec4a6d3ca8d78039ddfdd246260ac389734d64d8b7edac300b043cb98 | 412.13 MiB | 2026-01-07 | latest,version_1 |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role/cache@sha256:7a10a218063353eb8221b001cc03c32437896e3d9f8a49a3a314b7a463708e2f | 75.48 MiB | 2026-01-07 | latest |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/update_course_access/cache@sha256:5e591e8bb2ec160ff78b6e1d78c335fde2a23cd17300b680151443b3d78ed6ba | 75.48 MiB | 2026-01-07 | latest |

Оценка потенциального освобождения объёма (virtual size, без учёта дедупликации слоёв):
- Conservative (delete only untagged+unused): 0.00 MiB
- Moderate (keep last 3 digests per image + keep all used): 0.00 MiB
- Optional (если подтвердить, что tagged+unused не нужны): до 1.36 GiB

## 7) Риски

- Удаление digest’ов, которые используются в Cloud Run ревизиях, может сломать откат или повторный деплой старых ревизий.
- Наличие tag’ов (`latest`, `version_*`) не гарантирует использование; но removal tagged образов может повлиять на процессы CI/CD или откаты.
- Cache-образы (`*/cache`) могут использоваться механизмами сборки или функциями; перед удалением важно подтвердить, что пересборка не потребуется.
- Реальный billed storage может быть меньше виртуального размера из-за общих слоёв; экономия по деньгам будет ниже оценки по `imageSizeBytes`.

## 8) Следующие шаги

1) Согласовать политику хранения: например, сохранять N последних digest’ов на образ + все digest’ы, которые используются + 1–2 для отката.
2) Настроить cleanup policy в Artifact Registry (консервативную), ориентируясь на untagged+unused и возраст > 14/30 дней.
3) Подготовить отдельный скрипт очистки с dry-run и whitelisting используемых digest’ов (не выполняется сейчас).

## 9) Приложение

### Команды, которые были выполнены

- `ls`
- `cat AGENTS.md`
- `gcloud auth list`
- `gcloud config list`
- `gcloud config set project psych-dev-site-prod`
- `gcloud --version`
- `gcloud artifacts repositories list --project=psych-dev-site-prod --format=json`
- `gcloud artifacts docker images list europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json`
- `gcloud artifacts docker images list us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json`
- `gcloud run services list --project=psych-dev-site-prod --platform=managed --format=json`
- `gcloud run services describe ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json`
- `gcloud run revisions list --service=ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json`
- `gcloud functions list --gen2 --project=psych-dev-site-prod --format=json`
- `gcloud functions list --v2 --project=psych-dev-site-prod --format=json`
- `gcloud functions describe ingestBook --v2 --region=europe-west1 --project=psych-dev-site-prod --format=json`
- `mkdir -p logs/artifact-registry-investigation`
- `gcloud artifacts repositories list --project=psych-dev-site-prod --format=json > logs/artifact-registry-investigation/artifact_repos.json`
- `gcloud artifacts docker images list europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json > logs/artifact-registry-investigation/ar_images_europe-west1.json`
- `gcloud artifacts docker images list us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json > logs/artifact-registry-investigation/ar_images_us-central1.json`
- `gcloud run services list --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-investigation/run_services.json`
- `gcloud run services describe ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-investigation/run_service_ingestbook.json`
- `gcloud run revisions list --service=ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-investigation/run_revisions_ingestbook.json`
- `gcloud functions list --v2 --project=psych-dev-site-prod --format=json > logs/artifact-registry-investigation/functions_v2_list.json`
- `gcloud functions describe ingestBook --v2 --region=europe-west1 --project=psych-dev-site-prod --format=json > logs/artifact-registry-investigation/functions_ingestBook.json`
- `date -u +%Y-%m-%dT%H:%M:%SZ`
- `python3 - <<'PY' (parse JSON and build summary.json)`
- `python3 - <<'PY' (report metrics checks)`

### Версии инструментов

- Google Cloud SDK 543.0.0
- bq 2.1.24
- core 2025.10.10
- gcloud-crc32c 1.0.0
- gsutil 5.35

### Ошибки/ограничения и требуемые роли

- `gcloud functions list --gen2` вернул ошибку: `unrecognized arguments: --gen2` (использован эквивалент `--v2`).
- Дополнительных permission errors не обнаружено.
- При необходимости для read-only инвентаризации обычно хватает ролей: `roles/artifactregistry.reader`, `roles/run.viewer`, `roles/cloudfunctions.viewer` (или шире — `roles/viewer` на проект).
