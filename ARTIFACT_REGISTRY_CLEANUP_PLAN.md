# ARTIFACT_REGISTRY_CLEANUP_PLAN — psych-dev-site-prod

Дата (UTC): 2026-01-17T09:25:53Z

## 1) Summary

- KEEP_LAST_N = 2 (текущая + 1 на откат)
- Cloud Run сервисы: ingestbook
- Cloud Functions GEN_2: 1 (см. таблицу ниже)
- ingestbook: всего ревизий 25, кандидаты на удаление 23 (traffic=0 и вне KEEP_LAST_N)
- Потенциальные orphan digest’ы в europe-west1 после шага 2: 24 (untagged: 23, tagged: 1)
- us-central1 gcf-artifacts: нет используемых digest’ов (по Cloud Run/Functions GEN_2)

## 2) Инвентарь потребителей (ШАГ 0.2)

### Cloud Run (managed)

| service | region | revision | created (UTC) | traffic% | image@digest |
| --- | --- | --- | --- | --- | --- |
| ingestbook | europe-west1 | ingestbook-00001-qim | 2025-12-21T20:37:17Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:63f87f90977c7704272a84ecd3af1a18bb8253446ad1c8ed8bbd6159e3b3426e |
| ingestbook | europe-west1 | ingestbook-00002-fay | 2025-12-22T15:45:19Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a3fec53f7ba4da57284232d96d72e32075fa278cf109367775c91fecb3008c7a |
| ingestbook | europe-west1 | ingestbook-00003-fer | 2025-12-22T18:42:29Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5db0df7b1b144686d75f66449a90fccadf09978847bc04a2e9da3fb5baff17d8 |
| ingestbook | europe-west1 | ingestbook-00004-kuh | 2025-12-23T07:11:00Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5ae58db9c0938328a5fe168ae6813e209644760e7c70df2bc3e513957e78e5d4 |
| ingestbook | europe-west1 | ingestbook-00005-ciy | 2025-12-23T07:25:23Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a319a9c6140ad114446dbb89b7671b5ec50af0e4681bb2295780381dc500d3ca |
| ingestbook | europe-west1 | ingestbook-00006-yiq | 2025-12-23T07:32:24Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:70b115dccaa056efd9656e65b299cb6a955977a2dfb458e4195ce9d9d98e7957 |
| ingestbook | europe-west1 | ingestbook-00007-wiz | 2025-12-23T07:36:55Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f |
| ingestbook | europe-west1 | ingestbook-00008-jex | 2025-12-23T07:44:38Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:27f1678fcb369e02cae0ea9c151a30d128872e9f3e7b3c3ec913284005eda7cf |
| ingestbook | europe-west1 | ingestbook-00009-qep | 2025-12-23T11:23:18Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a212a74ec2368e662d7013761c45c3f7f35379dc5f5ff7f1f27b45d67d7d672a |
| ingestbook | europe-west1 | ingestbook-00010-riz | 2025-12-23T11:39:45Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:3b488da81a375222dc1bd5cb7a5cafed6bb5b4b2f953310859eddd1c5b53b634 |
| ingestbook | europe-west1 | ingestbook-00011-fef | 2025-12-23T11:48:07Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 |
| ingestbook | europe-west1 | ingestbook-00012-sub | 2025-12-23T11:52:17Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:12a50989dfaea5af2083df878e85e08322207c52d30d0075e435cb8036bb1786 |
| ingestbook | europe-west1 | ingestbook-00013-wic | 2025-12-23T13:17:20Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:809683953a44f476e5a79e8d85c088d492cbc5e756e6f60ef5226a4327932344 |
| ingestbook | europe-west1 | ingestbook-00014-duz | 2025-12-23T13:21:07Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:66501e33c72e794ef7cee8bc7e22e0398421b4474c2c3a2ba6fe5921fd64d531 |
| ingestbook | europe-west1 | ingestbook-00015-dok | 2025-12-23T16:10:03Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0ff6ed011889b34de3dfc17f16016209abc95d837b730276cce4f35d27867f11 |
| ingestbook | europe-west1 | ingestbook-00016-mof | 2025-12-24T11:42:31Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:24919195eae3a7ecba8fc62ae487c4d7615114d958eaa519b8fcd668d4a1831b |
| ingestbook | europe-west1 | ingestbook-00017-tov | 2025-12-24T16:29:07Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:2d7d2283557e4f715f87cbba8ed470a7fb5b46262e1c3ab65a76bada6331e1f9 |
| ingestbook | europe-west1 | ingestbook-00018-hip | 2025-12-24T16:44:19Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:b77e566bb354bf5f4ef523496f74e6dd7c4c16132a8d9fc46f0a56584ed03a79 |
| ingestbook | europe-west1 | ingestbook-00019-dah | 2025-12-24T17:20:40Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f8980fb9cb9f31633edfa58a429b0ece176f09694bbacbb99d1e2cbfd757627b |
| ingestbook | europe-west1 | ingestbook-00020-xak | 2025-12-24T17:42:26Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:974cb45a8a436dfc0cbf7a37be7ac559520082346e521d104533f700c7da6a94 |
| ingestbook | europe-west1 | ingestbook-00021-mur | 2025-12-25T09:27:06Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f39bc06cf5b2248644c0ce7398c35417ea479078ad7b736cad185816b26911b4 |
| ingestbook | europe-west1 | ingestbook-00022-deh | 2025-12-25T12:50:34Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:053efcdc02c44a9f7aee1e681d6c9a53377d75ecf5f0f6a7a7e692be10fd0b17 |
| ingestbook | europe-west1 | ingestbook-00023-lew | 2026-01-07T13:25:19Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:7465bbd7ea69da6c72dfb5a8c0834683bb2ccf95968e110ebebf3b2bf5f4b2cc |
| ingestbook | europe-west1 | ingestbook-00024-qex | 2026-01-07T23:19:15Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0f5807422c3c58b792a324e991cbdf3b1ef6fdf58a7688de6f47419d29b8ea00 |
| ingestbook | europe-west1 | ingestbook-00025-mof | 2026-01-07T23:22:49Z | 100 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:af0726f4d88b01983937673b42fb99ca8adde9f5aaef7345e3ae9aa29610843b |

### Cloud Functions GEN_2

| function | region | status | revision | image@digest | service |
| --- | --- | --- | --- | --- | --- |
| projects/psych-dev-site-prod/locations/europe-west1/functions/ingestBook | europe-west1 | ACTIVE | ingestbook-00025-mof | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:af0726f4d88b01983937673b42fb99ca8adde9f5aaef7345e3ae9aa29610843b | projects/psych-dev-site-prod/locations/europe-west1/services/ingestbook |

## 3) Инвентарь Artifact Registry (ШАГ 0.3)

| repo | sizeBytes (repo) | total virtual size | top-10 largest digest’ов |
| --- | --- | --- | --- |
| europe-west1/gcf-artifacts | 990.04 MiB | 1.19 GiB | 10 |
| us-central1/gcf-artifacts | 572.14 MiB | 1.22 GiB | 6 |

### Top-10 largest digest’ов

#### europe-west1/gcf-artifacts

| image@digest | size | created | tags | keep | reason |
| --- | --- | --- | --- | --- | --- |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache@sha256:863a4630e57d8be37543c27c72168ee46f3598cc0bae9a2c9f9adafb6c712f3a | 150.96 MiB | 2025-12-23 | latest | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 | 65.59 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f | 65.57 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a212a74ec2368e662d7013761c45c3f7f35379dc5f5ff7f1f27b45d67d7d672a | 65.57 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:12a50989dfaea5af2083df878e85e08322207c52d30d0075e435cb8036bb1786 | 65.56 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:27f1678fcb369e02cae0ea9c151a30d128872e9f3e7b3c3ec913284005eda7cf | 65.56 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:3b488da81a375222dc1bd5cb7a5cafed6bb5b4b2f953310859eddd1c5b53b634 | 65.56 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:70b115dccaa056efd9656e65b299cb6a955977a2dfb458e4195ce9d9d98e7957 | 65.55 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a319a9c6140ad114446dbb89b7671b5ec50af0e4681bb2295780381dc500d3ca | 65.55 MiB | 2025-12-23 | - | no | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:63f87f90977c7704272a84ecd3af1a18bb8253446ad1c8ed8bbd6159e3b3426e | 65.55 MiB | 2025-12-21 | - | no | - |

#### us-central1/gcf-artifacts

| image@digest | size | created | tags | keep | reason |
| --- | --- | --- | --- | --- | --- |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin@sha256:aeaa5069df4a58bf831e8614edf343b86ea35f657d7c55f1654ad6ccd09a9d12 | 412.13 MiB | 2026-01-07 | latest,version_23 | no | - |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role@sha256:8b3935eec4a6d3ca8d78039ddfdd246260ac389734d64d8b7edac300b043cb98 | 412.13 MiB | 2026-01-07 | latest,version_1 | no | - |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin/cache@sha256:3ad82538bd37533b4bfad130dd2e97276b95549e0499de8cb1724b4d3dc08ef2 | 150.96 MiB | 2025-12-23 | latest | no | - |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/migrate_admins/cache@sha256:ef790273bc3fcab1752d405fa5c9f45d6870288b52ec4d8e988d7bed0912ef68 | 119.37 MiB | 2025-12-22 | latest | no | - |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/update_course_access/cache@sha256:5e591e8bb2ec160ff78b6e1d78c335fde2a23cd17300b680151443b3d78ed6ba | 75.48 MiB | 2026-01-07 | latest | no | - |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role/cache@sha256:7a10a218063353eb8221b001cc03c32437896e3d9f8a49a3a314b7a463708e2f | 75.48 MiB | 2026-01-07 | latest | no | - |

## 4) Сопоставление зависимостей (ШАГ 0.4)

USED_DIGESTS_ACTIVE (traffic>0): 1
USED_DIGESTS_KEEP_LAST_N: 2
USED_DIGESTS_FUNCTIONS_GEN2: 1
USED_DIGESTS_TO_KEEP (union): 2

### KEEP/DELETE аннотация для digest’ов Artifact Registry

| repo | image@digest | created | size | tags | keep | reason |
| --- | --- | --- | --- | --- | --- | --- |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:053efcdc02c44a9f7aee1e681d6c9a53377d75ecf5f0f6a7a7e692be10fd0b17 | 2025-12-25 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0f5807422c3c58b792a324e991cbdf3b1ef6fdf58a7688de6f47419d29b8ea00 | 2026-01-07 | 21.66 MiB | - | yes | keep_last_2 |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0ff6ed011889b34de3dfc17f16016209abc95d837b730276cce4f35d27867f11 | 2025-12-23 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:12a50989dfaea5af2083df878e85e08322207c52d30d0075e435cb8036bb1786 | 2025-12-23 | 65.56 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:24919195eae3a7ecba8fc62ae487c4d7615114d958eaa519b8fcd668d4a1831b | 2025-12-24 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:27f1678fcb369e02cae0ea9c151a30d128872e9f3e7b3c3ec913284005eda7cf | 2025-12-23 | 65.56 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:2d7d2283557e4f715f87cbba8ed470a7fb5b46262e1c3ab65a76bada6331e1f9 | 2025-12-24 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:3b488da81a375222dc1bd5cb7a5cafed6bb5b4b2f953310859eddd1c5b53b634 | 2025-12-23 | 65.56 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5ae58db9c0938328a5fe168ae6813e209644760e7c70df2bc3e513957e78e5d4 | 2025-12-23 | 65.55 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5db0df7b1b144686d75f66449a90fccadf09978847bc04a2e9da3fb5baff17d8 | 2025-12-22 | 65.55 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:63f87f90977c7704272a84ecd3af1a18bb8253446ad1c8ed8bbd6159e3b3426e | 2025-12-21 | 65.55 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:66501e33c72e794ef7cee8bc7e22e0398421b4474c2c3a2ba6fe5921fd64d531 | 2025-12-23 | 21.64 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:70b115dccaa056efd9656e65b299cb6a955977a2dfb458e4195ce9d9d98e7957 | 2025-12-23 | 65.55 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:7465bbd7ea69da6c72dfb5a8c0834683bb2ccf95968e110ebebf3b2bf5f4b2cc | 2026-01-07 | 21.66 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:809683953a44f476e5a79e8d85c088d492cbc5e756e6f60ef5226a4327932344 | 2025-12-23 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:974cb45a8a436dfc0cbf7a37be7ac559520082346e521d104533f700c7da6a94 | 2025-12-24 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a212a74ec2368e662d7013761c45c3f7f35379dc5f5ff7f1f27b45d67d7d672a | 2025-12-23 | 65.57 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a319a9c6140ad114446dbb89b7671b5ec50af0e4681bb2295780381dc500d3ca | 2025-12-23 | 65.55 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a3fec53f7ba4da57284232d96d72e32075fa278cf109367775c91fecb3008c7a | 2025-12-22 | 65.55 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:af0726f4d88b01983937673b42fb99ca8adde9f5aaef7345e3ae9aa29610843b | 2026-01-07 | 21.66 MiB | latest,version_1 | yes | traffic>0,keep_last_2,function_gen2 |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:b77e566bb354bf5f4ef523496f74e6dd7c4c16132a8d9fc46f0a56584ed03a79 | 2025-12-24 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 | 2025-12-23 | 65.59 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f | 2025-12-23 | 65.57 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f39bc06cf5b2248644c0ce7398c35417ea479078ad7b736cad185816b26911b4 | 2025-12-25 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f8980fb9cb9f31633edfa58a429b0ece176f09694bbacbb99d1e2cbfd757627b | 2025-12-24 | 21.65 MiB | - | no | - |
| europe-west1/gcf-artifacts | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache@sha256:863a4630e57d8be37543c27c72168ee46f3598cc0bae9a2c9f9adafb6c712f3a | 2025-12-23 | 150.96 MiB | latest | no | - |
| us-central1/gcf-artifacts | us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin@sha256:aeaa5069df4a58bf831e8614edf343b86ea35f657d7c55f1654ad6ccd09a9d12 | 2026-01-07 | 412.13 MiB | latest,version_23 | no | - |
| us-central1/gcf-artifacts | us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin/cache@sha256:3ad82538bd37533b4bfad130dd2e97276b95549e0499de8cb1724b4d3dc08ef2 | 2025-12-23 | 150.96 MiB | latest | no | - |
| us-central1/gcf-artifacts | us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/migrate_admins/cache@sha256:ef790273bc3fcab1752d405fa5c9f45d6870288b52ec4d8e988d7bed0912ef68 | 2025-12-22 | 119.37 MiB | latest | no | - |
| us-central1/gcf-artifacts | us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role@sha256:8b3935eec4a6d3ca8d78039ddfdd246260ac389734d64d8b7edac300b043cb98 | 2026-01-07 | 412.13 MiB | latest,version_1 | no | - |
| us-central1/gcf-artifacts | us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role/cache@sha256:7a10a218063353eb8221b001cc03c32437896e3d9f8a49a3a314b7a463708e2f | 2026-01-07 | 75.48 MiB | latest | no | - |
| us-central1/gcf-artifacts | us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/update_course_access/cache@sha256:5e591e8bb2ec160ff78b6e1d78c335fde2a23cd17300b680151443b3d78ed6ba | 2026-01-07 | 75.48 MiB | latest | no | - |

## 5) Step-by-step objects to delete

### STEP 1 — us-central1/gcf-artifacts (minimal risk)

Условие: нет Cloud Run/Functions GEN_2, использующих образы из us-central1 gcf-artifacts.
Статус условия: ВЫПОЛНЕНО

Список images в us-central1/gcf-artifacts:

| image@digest | size | created | tags | keep |
| --- | --- | --- | --- | --- |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin@sha256:aeaa5069df4a58bf831e8614edf343b86ea35f657d7c55f1654ad6ccd09a9d12 | 412.13 MiB | 2026-01-07 | latest,version_23 | no |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/make_user_admin/cache@sha256:3ad82538bd37533b4bfad130dd2e97276b95549e0499de8cb1724b4d3dc08ef2 | 150.96 MiB | 2025-12-23 | latest | no |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/migrate_admins/cache@sha256:ef790273bc3fcab1752d405fa5c9f45d6870288b52ec4d8e988d7bed0912ef68 | 119.37 MiB | 2025-12-22 | latest | no |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role@sha256:8b3935eec4a6d3ca8d78039ddfdd246260ac389734d64d8b7edac300b043cb98 | 412.13 MiB | 2026-01-07 | latest,version_1 | no |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/set_user_role/cache@sha256:7a10a218063353eb8221b001cc03c32437896e3d9f8a49a3a314b7a463708e2f | 75.48 MiB | 2026-01-07 | latest | no |
| us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/update_course_access/cache@sha256:5e591e8bb2ec160ff78b6e1d78c335fde2a23cd17300b680151443b3d78ed6ba | 75.48 MiB | 2026-01-07 | latest | no |

### STEP 2 — Cloud Run revisions cleanup (KEEP_LAST_N)

#### Service: ingestbook

| revision | created | traffic% | image@digest |
| --- | --- | --- | --- |
| ingestbook-00001-qim | 2025-12-21T20:37:17Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:63f87f90977c7704272a84ecd3af1a18bb8253446ad1c8ed8bbd6159e3b3426e |
| ingestbook-00002-fay | 2025-12-22T15:45:19Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a3fec53f7ba4da57284232d96d72e32075fa278cf109367775c91fecb3008c7a |
| ingestbook-00003-fer | 2025-12-22T18:42:29Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5db0df7b1b144686d75f66449a90fccadf09978847bc04a2e9da3fb5baff17d8 |
| ingestbook-00004-kuh | 2025-12-23T07:11:00Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5ae58db9c0938328a5fe168ae6813e209644760e7c70df2bc3e513957e78e5d4 |
| ingestbook-00005-ciy | 2025-12-23T07:25:23Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a319a9c6140ad114446dbb89b7671b5ec50af0e4681bb2295780381dc500d3ca |
| ingestbook-00006-yiq | 2025-12-23T07:32:24Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:70b115dccaa056efd9656e65b299cb6a955977a2dfb458e4195ce9d9d98e7957 |
| ingestbook-00007-wiz | 2025-12-23T07:36:55Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f |
| ingestbook-00008-jex | 2025-12-23T07:44:38Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:27f1678fcb369e02cae0ea9c151a30d128872e9f3e7b3c3ec913284005eda7cf |
| ingestbook-00009-qep | 2025-12-23T11:23:18Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a212a74ec2368e662d7013761c45c3f7f35379dc5f5ff7f1f27b45d67d7d672a |
| ingestbook-00010-riz | 2025-12-23T11:39:45Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:3b488da81a375222dc1bd5cb7a5cafed6bb5b4b2f953310859eddd1c5b53b634 |
| ingestbook-00011-fef | 2025-12-23T11:48:07Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 |
| ingestbook-00012-sub | 2025-12-23T11:52:17Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:12a50989dfaea5af2083df878e85e08322207c52d30d0075e435cb8036bb1786 |
| ingestbook-00013-wic | 2025-12-23T13:17:20Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:809683953a44f476e5a79e8d85c088d492cbc5e756e6f60ef5226a4327932344 |
| ingestbook-00014-duz | 2025-12-23T13:21:07Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:66501e33c72e794ef7cee8bc7e22e0398421b4474c2c3a2ba6fe5921fd64d531 |
| ingestbook-00015-dok | 2025-12-23T16:10:03Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0ff6ed011889b34de3dfc17f16016209abc95d837b730276cce4f35d27867f11 |
| ingestbook-00016-mof | 2025-12-24T11:42:31Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:24919195eae3a7ecba8fc62ae487c4d7615114d958eaa519b8fcd668d4a1831b |
| ingestbook-00017-tov | 2025-12-24T16:29:07Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:2d7d2283557e4f715f87cbba8ed470a7fb5b46262e1c3ab65a76bada6331e1f9 |
| ingestbook-00018-hip | 2025-12-24T16:44:19Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:b77e566bb354bf5f4ef523496f74e6dd7c4c16132a8d9fc46f0a56584ed03a79 |
| ingestbook-00019-dah | 2025-12-24T17:20:40Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f8980fb9cb9f31633edfa58a429b0ece176f09694bbacbb99d1e2cbfd757627b |
| ingestbook-00020-xak | 2025-12-24T17:42:26Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:974cb45a8a436dfc0cbf7a37be7ac559520082346e521d104533f700c7da6a94 |
| ingestbook-00021-mur | 2025-12-25T09:27:06Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f39bc06cf5b2248644c0ce7398c35417ea479078ad7b736cad185816b26911b4 |
| ingestbook-00022-deh | 2025-12-25T12:50:34Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:053efcdc02c44a9f7aee1e681d6c9a53377d75ecf5f0f6a7a7e692be10fd0b17 |
| ingestbook-00023-lew | 2026-01-07T13:25:19Z | 0 | europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:7465bbd7ea69da6c72dfb5a8c0834683bb2ccf95968e110ebebf3b2bf5f4b2cc |

### STEP 3 — Artifact Registry europe-west1 orphan digest’ы (после шага 2)

A) untagged + orphan

| image@digest | size | created | tags |
| --- | --- | --- | --- |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:053efcdc02c44a9f7aee1e681d6c9a53377d75ecf5f0f6a7a7e692be10fd0b17 | 21.65 MiB | 2025-12-25 | - |
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
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:b77e566bb354bf5f4ef523496f74e6dd7c4c16132a8d9fc46f0a56584ed03a79 | 21.65 MiB | 2025-12-24 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 | 65.59 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f | 65.57 MiB | 2025-12-23 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f39bc06cf5b2248644c0ce7398c35417ea479078ad7b736cad185816b26911b4 | 21.65 MiB | 2025-12-25 | - |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f8980fb9cb9f31633edfa58a429b0ece176f09694bbacbb99d1e2cbfd757627b | 21.65 MiB | 2025-12-24 | - |

B) tagged + orphan (только если теги не относятся к KEEP_LAST_N/ACTIVE)

| image@digest | size | created | tags |
| --- | --- | --- | --- |
| europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache@sha256:863a4630e57d8be37543c27c72168ee46f3598cc0bae9a2c9f9adafb6c712f3a | 150.96 MiB | 2025-12-23 | latest |

## 6) Risk notes

- Проверки ограничены Cloud Run + Cloud Functions GEN_2; другие потребители (GKE/Compute/Cloud Build) не проверялись.
- Удаление старых ревизий исключает быстрый откат на эти ревизии; KEEP_LAST_N=2 оставляет окно отката на последнюю + предыдущую.
- Для tagged образов (например, latest/version_*) требуется дополнительная ручная валидация, что они не используются в CI/CD.

## 7) Rollback notes

- После шага 2 остаются все ревизии с traffic>0% и последние KEEP_LAST_N по времени создания.
- При необходимости отката — использовать сохранённые ревизии (latest + предыдущая).

## 8) Commands to execute (exact)

### STEP 1

```bash
# List repos (validation)
gcloud artifacts repositories list --project=psych-dev-site-prod --format=json
# Delete repository (run only after confirmation)
gcloud artifacts repositories delete gcf-artifacts --location=us-central1 --project=psych-dev-site-prod
```

### STEP 2

```bash
gcloud run revisions delete ingestbook-00023-lew --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00022-deh --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00021-mur --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00020-xak --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00019-dah --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00018-hip --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00017-tov --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00016-mof --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00015-dok --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00014-duz --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00013-wic --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00012-sub --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00011-fef --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00010-riz --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00009-qep --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00008-jex --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00007-wiz --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00006-yiq --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00005-ciy --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00004-kuh --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00003-fer --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00002-fay --region=europe-west1 --project=psych-dev-site-prod --platform=managed
gcloud run revisions delete ingestbook-00001-qim --region=europe-west1 --project=psych-dev-site-prod --platform=managed
```

### STEP 3

```bash
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:053efcdc02c44a9f7aee1e681d6c9a53377d75ecf5f0f6a7a7e692be10fd0b17 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:0ff6ed011889b34de3dfc17f16016209abc95d837b730276cce4f35d27867f11 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:12a50989dfaea5af2083df878e85e08322207c52d30d0075e435cb8036bb1786 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:24919195eae3a7ecba8fc62ae487c4d7615114d958eaa519b8fcd668d4a1831b --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:27f1678fcb369e02cae0ea9c151a30d128872e9f3e7b3c3ec913284005eda7cf --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:2d7d2283557e4f715f87cbba8ed470a7fb5b46262e1c3ab65a76bada6331e1f9 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:3b488da81a375222dc1bd5cb7a5cafed6bb5b4b2f953310859eddd1c5b53b634 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5ae58db9c0938328a5fe168ae6813e209644760e7c70df2bc3e513957e78e5d4 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:5db0df7b1b144686d75f66449a90fccadf09978847bc04a2e9da3fb5baff17d8 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:63f87f90977c7704272a84ecd3af1a18bb8253446ad1c8ed8bbd6159e3b3426e --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:66501e33c72e794ef7cee8bc7e22e0398421b4474c2c3a2ba6fe5921fd64d531 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:70b115dccaa056efd9656e65b299cb6a955977a2dfb458e4195ce9d9d98e7957 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:7465bbd7ea69da6c72dfb5a8c0834683bb2ccf95968e110ebebf3b2bf5f4b2cc --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:809683953a44f476e5a79e8d85c088d492cbc5e756e6f60ef5226a4327932344 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:974cb45a8a436dfc0cbf7a37be7ac559520082346e521d104533f700c7da6a94 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a212a74ec2368e662d7013761c45c3f7f35379dc5f5ff7f1f27b45d67d7d672a --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a319a9c6140ad114446dbb89b7671b5ec50af0e4681bb2295780381dc500d3ca --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:a3fec53f7ba4da57284232d96d72e32075fa278cf109367775c91fecb3008c7a --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:b77e566bb354bf5f4ef523496f74e6dd7c4c16132a8d9fc46f0a56584ed03a79 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:d987fb5a61f5d37635085c3d964e3b51348f37fb3bac65c155997913d4007a69 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:e15010d19d351e0ec8247c81abe2ba6a16f7773788c9d3a07648579339e51f6f --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f39bc06cf5b2248644c0ce7398c35417ea479078ad7b736cad185816b26911b4 --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book@sha256:f8980fb9cb9f31633edfa58a429b0ece176f09694bbacbb99d1e2cbfd757627b --project=psych-dev-site-prod
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/psych--dev--site--prod__europe--west1__ingest_book/cache@sha256:863a4630e57d8be37543c27c72168ee46f3598cc0bae9a2c9f9adafb6c712f3a --project=psych-dev-site-prod
```