-- ═══════════════════════════════════════════════════════
-- GoCrag — Seed Completo
-- Corre DEPOIS do schema_v2.sql
-- ═══════════════════════════════════════════════════════

-- Limpa dados existentes (ordem correcta por FK)
truncate public.notes      cascade;
truncate public.uploads    cascade;
truncate public.favorites  cascade;
truncate public.sessions   cascade;
truncate public.challenges cascade;
truncate public.sectors    cascade;
truncate public.spots      cascade;

-- ─── SPOTS ──────────────────────────────────────────────
insert into public.spots
  (id, name, description, location, lat, lng, rock_type, level_min, level_max, style, walk_time, how_to_get)
values
  ('spot-0001-0000-0000-000000000001',
   'Pedra da Anicha',
   'Zona de blocos com ótima aderência. Vários problemas desde o 4º ao 7A. Sombra de manhã — ideal para dias quentes.',
   'Sintra, Portugal', 38.7923, -9.3942,
   'Granito', '5a', '7a', 'Boulder', '10-15 min',
   'Seguir pela estrada de terra até ao parque de merendas. Trilho bem marcado à esquerda.'),

  ('spot-0002-0000-0000-000000000002',
   'Vale das Fontes',
   'Spot familiar com blocos de baixo perfil e boa concentração de problemas de nível intermédio.',
   'Cascais, Portugal', 38.6970, -9.4218,
   'Calcário', '4c', '6c', 'Boulder', '5 min',
   'Parque de estacionamento gratuito junto à entrada da quinta.'),

  ('spot-0003-0000-0000-000000000003',
   'Cova da Onça',
   'Spot avançado com travessias longas e técnicas. Exposição total ao sol — evitar no verão.',
   'Setúbal, Portugal', 38.5320, -8.9010,
   'Granito', '6a', '7c+', 'Boulder', '20-30 min',
   'Acesso pela EN10, km 42. Caminho de terra por 2km.'),

  ('spot-0004-0000-0000-000000000004',
   'Alto da Serra',
   'Paisagem espetacular no planalto alentejano. Blocos enormes. Ideal de outubro a abril.',
   'Évora, Portugal', 38.5710, -7.9070,
   'Granito', '5c', '8a', 'Boulder', '15 min',
   'Saída da A6 em Montemor-o-Novo. 12km em direção à serra.'),

  ('spot-0005-0000-0000-000000000005',
   'Pedra do Equilíbrio',
   'Blocos baixos num ambiente florestal. Ótimo para iniciantes e progressão.',
   'Mafra, Portugal', 38.9410, -9.3320,
   'Calcário', '4a', '6b', 'Boulder', '5 min',
   'Parque Natural de Sintra-Cascais, sector norte.'),

  ('spot-0006-0000-0000-000000000006',
   'Serras de Aire',
   'Um dos melhores calcários de Portugal. Problemas de todos os níveis.',
   'Porto de Mós, Portugal', 39.6028, -8.7091,
   'Calcário', '5b', '8a+', 'Boulder', '20 min',
   'PN Serras de Aire e Candeeiros, acesso pela EN361.'),

  ('spot-0007-0000-0000-000000000007',
   'Rocha do Moinho',
   'Blocos isolados num pinar. Boa sombra durante o dia.',
   'Leiria, Portugal', 39.7437, -8.8071,
   'Calcário', '5a', '7b', 'Boulder', '10 min',
   'N242, saída Marrazes, trilho amarelo 1km.');

-- ─── SECTORS ────────────────────────────────────────────
insert into public.sectors (id, spot_id, name, description, order_index) values

  -- Pedra da Anicha
  ('sect-0001-0000-0000-000000000001', 'spot-0001-0000-0000-000000000001',
   'Principal', 'Sector central com os blocos mais emblemáticos. Aderência excecional em granito.', 0),
  ('sect-0002-0000-0000-000000000002', 'spot-0001-0000-0000-000000000001',
   'Bosque', 'Área arborizada com blocos de médio porte. Sombra durante o dia.', 1),

  -- Vale das Fontes
  ('sect-0003-0000-0000-000000000003', 'spot-0002-0000-0000-000000000002',
   'Vale', 'Todos os problemas concentrados numa zona de 200m²', 0),

  -- Cova da Onça
  ('sect-0004-0000-0000-000000000004', 'spot-0003-0000-0000-000000000003',
   'Bloco Principal', 'O bloco central com os problemas mais difíceis e travessias icónicas.', 0),
  ('sect-0005-0000-0000-000000000005', 'spot-0003-0000-0000-000000000003',
   'Travessias', 'Zona horizontal — resistência e continuidade.', 1),

  -- Alto da Serra
  ('sect-0006-0000-0000-000000000006', 'spot-0004-0000-0000-000000000004',
   'Topo', 'Vista 360º. Os blocos mais altos e imponentes.', 0),
  ('sect-0007-0000-0000-000000000007', 'spot-0004-0000-0000-000000000004',
   'Encosta', 'Zona de aquecimento na meia encosta.', 1),

  -- Pedra do Equilíbrio
  ('sect-0008-0000-0000-000000000008', 'spot-0005-0000-0000-000000000005',
   'Floresta', 'Ambiente florestal, blocos baixos, aterragem excelente.', 0),

  -- Serras de Aire
  ('sect-0009-0000-0000-000000000009', 'spot-0006-0000-0000-000000000006',
   'Plateau', 'Calcário horizontal com os melhores problemas de força.', 0),
  ('sect-0010-0000-0000-000000000010', 'spot-0006-0000-0000-000000000006',
   'Grottão', 'Teto e compressão. Requere proteção extra.', 1),

  -- Rocha do Moinho
  ('sect-0011-0000-0000-000000000011', 'spot-0007-0000-0000-000000000007',
   'Pinar', 'Blocos dispersos entre pinheiros.', 0);

-- ─── CHALLENGES ─────────────────────────────────────────
insert into public.challenges
  (id, sector_id, spot_id, name, grade, description, style, landing, order_index)
values

  -- Principal (Pedra da Anicha)
  ('chal-0001-0000-0000-000000000001',
   'sect-0001-0000-0000-000000000001', 'spot-0001-0000-0000-000000000001',
   'Alma Pequena', '6C',
   'Saída técnica pela aresta esquerda. Agarras pequenas mas aderência excelente.', 'Crimpy', 'Boa', 0),

  ('chal-0002-0000-0000-000000000002',
   'sect-0001-0000-0000-000000000001', 'spot-0001-0000-0000-000000000001',
   'Projeto dos Sonhos', '7A',
   'O problema mais clássico do spot. Dyno central com aterragem perfeita.', 'Dyno', 'Boa', 1),

  ('chal-0003-0000-0000-000000000003',
   'sect-0001-0000-0000-000000000001', 'spot-0001-0000-0000-000000000001',
   'Mais Vale Um...', '6A+',
   'Boa introdução ao granito de Sintra. Problema de iniciação ao spot.', 'Slab', 'Boa', 2),

  ('chal-0004-0000-0000-000000000004',
   'sect-0001-0000-0000-000000000001', 'spot-0001-0000-0000-000000000001',
   'Granito e Mar', '5B',
   'Vista para o oceano. Acessível, boa exposição.', 'Slab', 'Boa', 3),

  -- Bosque (Pedra da Anicha)
  ('chal-0005-0000-0000-000000000005',
   'sect-0002-0000-0000-000000000002', 'spot-0001-0000-0000-000000000001',
   'Sombra e Luz', '6B',
   'Movimentos de equilíbrio à sombra do pinheiro.', 'Balance', 'Razoável', 0),

  ('chal-0006-0000-0000-000000000006',
   'sect-0002-0000-0000-000000000002', 'spot-0001-0000-0000-000000000001',
   'Raiz', '5C',
   'Segue o perfil da raiz exposta. Início sentado.', 'Crimpy', 'Boa', 1),

  -- Vale das Fontes
  ('chal-0007-0000-0000-000000000007',
   'sect-0003-0000-0000-000000000003', 'spot-0002-0000-0000-000000000002',
   'Fonte Fria', '5A',
   'Clássico do spot. Perfeito para iniciantes.', 'Jug', 'Boa', 0),

  ('chal-0008-0000-0000-000000000008',
   'sect-0003-0000-0000-000000000003', 'spot-0002-0000-0000-000000000002',
   'Calcário Vivo', '6A',
   'Movimentos fluidos em calcário compacto.', 'Sloper', 'Boa', 1),

  ('chal-0009-0000-0000-000000000009',
   'sect-0003-0000-0000-000000000003', 'spot-0002-0000-0000-000000000002',
   'Névoa da Manhã', '6B+',
   'Melhor de manhã com pouca humidade.', 'Crimp', 'Boa', 2),

  -- Bloco Principal (Cova da Onça)
  ('chal-0010-0000-0000-000000000010',
   'sect-0004-0000-0000-000000000004', 'spot-0003-0000-0000-000000000003',
   'A Onça Dorme', '7B+',
   'O projeto mais difícil do spot. Trem superior intenso.', 'Overhang', 'Má', 0),

  ('chal-0011-0000-0000-000000000011',
   'sect-0004-0000-0000-000000000004', 'spot-0003-0000-0000-000000000003',
   'Rugido', '7A',
   'Saída de teto com dyno final. Espetacular quando sai.', 'Dyno', 'Razoável', 1),

  -- Alto da Serra - Topo
  ('chal-0012-0000-0000-000000000012',
   'sect-0006-0000-0000-000000000006', 'spot-0004-0000-0000-000000000004',
   'Vento do Norte', '7C',
   'Problema de força máxima com vista 360º.', 'Power', 'Razoável', 0),

  ('chal-0013-0000-0000-000000000013',
   'sect-0006-0000-0000-000000000006', 'spot-0004-0000-0000-000000000004',
   'Alentejo Puro', '6B',
   'Leitura de movimento em xisto. Técnico e elegante.', 'Technical', 'Boa', 1),

  -- Serras de Aire - Plateau
  ('chal-0014-0000-0000-000000000014',
   'sect-0009-0000-0000-000000000009', 'spot-0006-0000-0000-000000000006',
   'Calcário Eterno', '8A',
   'Um dos projectos mais duros do país. Só para os melhores.', 'Power Endurance', 'Boa', 0),

  ('chal-0015-0000-0000-000000000015',
   'sect-0009-0000-0000-000000000009', 'spot-0006-0000-0000-000000000006',
   'Pedra Viva', '6C+',
   'Clássico das Serras. Movimentos de pressão e equilíbrio.', 'Technical', 'Boa', 1);
