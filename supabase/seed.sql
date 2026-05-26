-- ═══════════════════════════════════════════════════════
-- GoCrag — Seed Data (dados de teste)
-- Corre DEPOIS do schema.sql
-- ═══════════════════════════════════════════════════════

-- Spots de bouldering em Portugal
insert into public.spots (id, name, description, location, lat, lng, rock_type, level_min, level_max, style, walk_time, how_to_get, cover_url) values

('11111111-0000-0000-0000-000000000001',
 'Pedra da Anicha', 
 'Zona de blocos com ótima aderência e vários problemas desde o 4º ao 7A. Sombra de manhã, ideal para dias quentes. Um dos spots mais frequentados da zona de Sintra.',
 'Sintra, Portugal', 38.7923, -9.3942,
 'Granito', '5a', '7a', 'Boulder', '10-15 min',
 'Seguir pela estrada de terra até ao parque de merendas. Trilho bem marcado à esquerda, 10 minutos a pé.',
 null),

('11111111-0000-0000-0000-000000000002',
 'Vale das Fontes',
 'Spot familiar com blocos de baixo perfil e boa concentração de problemas de nível intermédio. Ideal para sessões de grupo.',
 'Cascais, Portugal', 38.6970, -9.4218,
 'Calcário', '4c', '6c', 'Boulder', '5 min',
 'Parque de estacionamento gratuito junto à entrada da quinta. Trilho a 5 minutos a pé.',
 null),

('11111111-0000-0000-0000-000000000003',
 'Cova da Onça',
 'Spot avançado com travessias longas e problemas técnicos. Exposição total ao sol — evitar no verão. Referência nacional para escaladores 7c+.',
 'Setúbal, Portugal', 38.5320, -8.9010,
 'Granito', '6a', '7c+', 'Boulder', '20-30 min',
 'Acesso pela EN10. Estacionamento no km 42. Caminho de terra 2km até ao local.',
 null),

('11111111-0000-0000-0000-000000000004',
 'Alto da Serra',
 'Paisagem espetacular no planalto alentejano. Blocos enormes com problemáticas variadas. Ideal de outubro a abril.',
 'Évora, Portugal', 38.5710, -7.9070,
 'Granito', '5c', '8a', 'Boulder', '15 min',
 'Saída da A6 em Montemor-o-Novo. Seguir direção serra por 12km. Estacionamento informal.',
 null),

('11111111-0000-0000-0000-000000000005',
 'Pedra do Equilíbrio',
 'Ótimo spot para iniciantes e progressão. Blocos baixos num ambiente florestal agradável. Muito frequentado ao fim de semana.',
 'Mafra, Portugal', 38.9410, -9.3320,
 'Calcário', '4a', '6b', 'Boulder', '5 min',
 'Parque Natural de Sintra-Cascais, sector norte. GPS: 38.941, -9.332.',
 null),

('11111111-0000-0000-0000-000000000006',
 'Serras de Aire',
 'Um dos melhores calcários de Portugal. Problemas de todos os níveis num ambiente de paisagem protegida.',
 'Porto de Mós, Portugal', 39.6028, -8.7091,
 'Calcário', '5b', '8a+', 'Boulder', '20 min',
 'PN Serras de Aire e Candeeiros, acesso pela EN361. Estacionamento no centro de visitantes.',
 null);

-- Sectores dos spots
insert into public.sectors (id, spot_id, name, description, order_index) values

-- Pedra da Anicha
('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Principal', 'Sector central com os blocos mais emblemáticos. Aderência excecional.', 0),
('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Bosque', 'Área arborizada com blocos de médio porte. Sombra durante o dia.', 1),

-- Vale das Fontes
('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'Vale', 'Sector único com todos os problemas concentrados numa zona de 200m.', 0),

-- Cova da Onça
('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'Bloco Principal', 'O bloco central com os problemas mais difíceis e as travessias icónicas.', 0),
('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', 'Travessias', 'Zona especializada em travessias. Problemas horizontais e resistência.', 1),

-- Alto da Serra
('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000004', 'Topo', 'Vista 360º. Os blocos mais altos e imponentes do spot.', 0),
('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000004', 'Encosta', 'Zona de aquecimento. Problemas mais acessíveis na meia encosta.', 1),

-- Pedra do Equilíbrio
('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000005', 'Floresta', 'Ambiente florestal. Blocos baixos com aterragem excelente.', 0),

-- Serras de Aire
('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000006', 'Plateau', 'O plateau calcário com os melhores problemas de força.', 0),
('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000006', 'Grottão', 'Zona de teto e problemas de compressão. Requere proteção extra.', 1);

-- Problemas/Desafios por sector
insert into public.challenges (id, sector_id, spot_id, name, grade, description, style, landing, order_index) values

-- Principal (Pedra da Anicha)
('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Alma Pequena', '6C', 'Saída técnica pela aresta esquerda. As agarras são pequenas mas a aderência do granito ajuda.', 'Crimpy', 'Boa', 0),
('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Projeto dos Sonhos', '7A', 'O problema mais clássico do spot. Dyno central com aterragem perfeita.', 'Dyno', 'Boa', 1),
('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Mais Vale Um...', '6A+', 'Problema de iniciação ao spot. Boa introdução ao granito de Sintra.', 'Slab', 'Boa', 2),
('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Granito e Mar', '5B', 'Vista para o oceano. Problema acessível com bela exposição.', 'Slab', 'Boa', 3),

-- Bosque (Pedra da Anicha)
('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
 'Sombra e Luz', '6B', 'Bloco à sombra do pinheiro. Movimentos de equilíbrio.', 'Balance', 'Razoável', 0),
('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
 'Raiz', '5C', 'Segue o perfil da raiz exposta. Início sentado.', 'Crimpy', 'Boa', 1),

-- Vale (Vale das Fontes)
('33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
 'Fonte Fria', '5A', 'Clássico do spot. Perfeito para iniciantes.', 'Jug', 'Boa', 0),
('33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
 'Calcário Vivo', '6A', 'Movimentos fluidos em calcário compacto.', 'Sloper', 'Boa', 1),

-- Bloco Principal (Cova da Onça)
('33333333-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003',
 'A Onça Dorme', '7B+', 'O projeto mais difícil do spot. Requer muito trem superior.', 'Overhang', 'Má', 0),
('33333333-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003',
 'Rugido', '7A', 'Saída de teto com dyno final. Espetacular.', 'Dyno', 'Razoável', 1);
