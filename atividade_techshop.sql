

-- CRIAÇÃO E SELEÇÃO DO BANCO DE DADOS
CREATE DATABASE techshop;
USE techshop;


-- =============================================================
-- PASSO 1: CRIAÇÃO DAS TABELAS (DDL)
-- =============================================================

-- 1. Criar a tabela de Clientes
CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    data_cadastro DATE DEFAULT (CURRENT_DATE),
    CONSTRAINT pk_clientes PRIMARY KEY (id_cliente),
    CONSTRAINT unq_email_cliente UNIQUE (email)
);


-- 2. Criar a tabela de Produtos
CREATE TABLE produtos (
    id_product INT AUTO_INCREMENT,
    nome_produto VARCHAR(100) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    estoque INT NOT NULL,
    CONSTRAINT pk_produtos PRIMARY KEY (id_product)
);


-- 3. Criar a tabela de Pedidos
CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_pedido VARCHAR(20) DEFAULT 'Pendente',
    CONSTRAINT pk_pedidos PRIMARY KEY (id_pedido),
    CONSTRAINT fk_pedidos_clientes FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE CASCADE
);


-- 4. Criar a tabela Itens do Pedido
CREATE TABLE itens_pedido (
    id_pedido INT NOT NULL,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    CONSTRAINT pk_itens_pedido PRIMARY KEY (id_pedido, id_produto),
    CONSTRAINT fk_itens_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE CASCADE
);


-- =============================================================
-- PASSO 2: ALTERAÇÃO DE ESTRUTURA (DDL - ALTER TABLE)
-- =============================================================

-- 1. Corrigir o nome da coluna id_product para id_produto
ALTER TABLE produtos
CHANGE id_product id_produto INT AUTO_INCREMENT;


-- 2. Adicionar a chave estrangeira dos produtos
ALTER TABLE itens_pedido
ADD CONSTRAINT fk_itens_produtos
FOREIGN KEY (id_produto)
REFERENCES produtos(id_produto);


-- 3. Adicionar a coluna categoria
ALTER TABLE produtos
ADD categoria VARCHAR(50) NOT NULL DEFAULT 'Geral';


-- =============================================================
-- PASSO 3: INSERÇÃO E MANIPULAÇÃO DE DADOS (DML)
-- =============================================================

-- 1. Inserindo Clientes
INSERT INTO clientes (nome, email, data_cadastro) VALUES
('Ana Silva', 'ana.silva@email.com', '2026-01-10'),
('Bruno Costa', 'bruno.costa@email.com', '2026-02-15'),
('Carlos Souza', 'carlos.souza@email.com', '2026-03-01'),
('Diana Souza', 'diana.souza@email.com', '2026-03-15');


-- 2. Inserindo Produtos
INSERT INTO produtos (nome_produto, preco, estoque, categoria)
VALUES
('Notebook Gamer', 4500.00, 10, 'Eletrônicos'),
('Smartphone 5G', 2500.00, 25, 'Eletrônicos'),
('Mouse Sem Fio', 150.00, 50, 'Acessórios'),
('Teclado Mecânico', 350.00, 0, 'Acessórios'),
('Cadeira Ergonômica', 1200.00, 8, 'Móveis');


-- 3. Inserindo Pedidos
INSERT INTO pedidos (id_cliente, status_pedido) VALUES
(1, 'Concluído'),
(2, 'Concluído'),
(3, 'Pendente'),
(1, 'Concluído');


-- 4. Inserindo Itens dos Pedidos
INSERT INTO itens_pedido
(id_pedido, id_produto, quantidade, preco_unitario)
VALUES
(1, 1, 1, 4500.00),
(1, 3, 2, 150.00),
(2, 2, 1, 2500.00),
(3, 4, 1, 350.00),
(4, 5, 1, 1200.00);


-- 5. Aumentar em 10% o preço dos produtos da categoria Acessórios
UPDATE produtos
SET preco = preco * 1.10
WHERE categoria = 'Acessórios';


-- 6. Inserir e remover um cliente fictício
INSERT INTO clientes (nome, email)
VALUES ('Teste Apagar', 'teste@apagar.com');

DELETE FROM clientes
WHERE email = 'teste@apagar.com';


-- =============================================================
-- PASSO 4: CONSULTAS AVANÇADAS (DQL)
-- =============================================================

-- QUERY 1: Relatório Completo de Vendas
SELECT
    p.id_pedido,
    c.nome AS nome_cliente,
    SUM(i.quantidade * i.preco_unitario) AS total_pedido,
    p.status_pedido
FROM pedidos p
INNER JOIN clientes c
    ON p.id_cliente = c.id_cliente
INNER JOIN itens_pedido i
    ON p.id_pedido = i.id_pedido
GROUP BY
    p.id_pedido,
    c.nome,
    p.status_pedido
ORDER BY total_pedido DESC;


-- QUERY 2: Análise de Estoque Crítico
SELECT
    prod.nome_produto,
    prod.estoque AS estoque_atual,
    IFNULL(SUM(itens.quantidade), 0) AS total_unidades_vendidas
FROM produtos prod
LEFT JOIN itens_pedido itens
    ON prod.id_produto = itens.id_produto
GROUP BY
    prod.id_produto,
    prod.nome_produto,
    prod.estoque;


-- QUERY 3: Clientes que compraram produtos da categoria Eletrônicos
SELECT
    nome,
    email
FROM clientes
WHERE id_cliente IN (
    SELECT p.id_cliente
    FROM pedidos p
    INNER JOIN itens_pedido ip
        ON p.id_pedido = ip.id_pedido
    INNER JOIN produtos prod
        ON ip.id_produto = prod.id_produto
    WHERE prod.categoria = 'Eletrônicos'
);


-- QUERY 4: Categorias com média de preço acima da média geral
SELECT
    categoria,
    ROUND(AVG(preco), 2) AS media_preco_categoria
FROM produtos
GROUP BY categoria
HAVING AVG(preco) > (
    SELECT AVG(preco)
    FROM produtos
);


-- =============================================================
-- DESAFIO PRÁTICO (PÓS-IMPLEMENTAÇÃO)
-- =============================================================

-- 1. Adicionar a coluna telefone
ALTER TABLE clientes
ADD telefone VARCHAR(15);


-- 2. Atualizar o telefone da Ana Silva
UPDATE clientes
SET telefone = '11999999999'
WHERE nome = 'Ana Silva';


-- 3. Mostrar clientes que nunca fizeram nenhum pedido
SELECT
    c.id_cliente,
    c.nome,
    c.email,
    c.telefone
FROM clientes c
LEFT JOIN pedidos p
    ON c.id_cliente = p.id_cliente
WHERE p.id_pedido IS NULL;


SELECT * FROM itens_pedido;""