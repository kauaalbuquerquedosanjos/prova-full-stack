import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Conexão com o MongoDB Atlas
const mongoURI = "mongodb+srv://kaua:Kaua4595@kauaalbuquerquedosanjos.myryjlm.mongodb.net/?appName=KauaAlbuquerquedosAnjos";

mongoose.connect(mongoURI)
  .then(() => console.log("Conectado ao MongoDB Atlas com sucesso!"))
  .catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// Schemas e Models
const produtoSchema = new mongoose.Schema({ 
  id_produto: Number, 
  nome_produto: String, 
  estoque: Number, 
  preco: Number, 
  categoria: String 
});
const Produto = mongoose.model('Produto', produtoSchema);

const clienteSchema = new mongoose.Schema({ 
  id_cliente: Number, 
  nome: String, 
  email: String, 
  telefone: String 
});
const Cliente = mongoose.model('Cliente', clienteSchema);

const itemPedidoSchema = new mongoose.Schema({ 
  id_produto: Number, 
  quantidade: Number, 
  preco_unitario: Number 
});
const pedidoSchema = new mongoose.Schema({ 
  id_pedido: Number, 
  id_cliente: Number, 
  status_pedido: String, 
  itens: [itemPedidoSchema] 
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota raiz para carregar o front-end na URL principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rotas da API
app.get('/api/relatorio-vendas', async (req, res) => {
  try {
    const pedidos = await Pedido.find({});
    const clientes = await Cliente.find({});
    
    const relatorio = pedidos.map(pedido => {
      const cliente = clientes.find(c => c.id_cliente === pedido.id_cliente);
      const totalPedido = pedido.itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);
      
      return {
        id_pedido: pedido.id_pedido,
        nome_cliente: cliente ? cliente.nome : 'Cliente Desconhecido',
        total_pedido: totalPedido,
        status_pedido: pedido.status_pedido
      };
    });

    res.json(relatorio);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.get('/api/estoque', async (req, res) => {
  try {
    const produtos = await Produto.find({});
    const pedidos = await Pedido.find({});

    const estoqueComVendas = produtos.map(prod => {
      let totalVendido = 0;
      pedidos.forEach(ped => {
        ped.itens.forEach(item => {
          if (item.id_produto === prod.id_produto) {
            totalVendido += item.quantidade;
          }
        });
      });

      return {
        id_produto: prod.id_produto,
        nome_produto: prod.nome_produto,
        estoque_atual: prod.estoque,
        total_unidades_vendidas: totalVendido
      };
    });

    res.json(estoqueComVendas);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Rota para atualizar o estoque do produto (Bloqueia se for Cliente)
app.put('/api/produtos/:id_produto', async (req, res) => {
  const nivelAcesso = req.headers['user-level'];

  if (nivelAcesso === 'Client') {
    return res.status(403).json({ erro: 'Acesso negado: Clientes possuem apenas permissão de visualização e não podem alterar dados.' });
  }

  const { id_produto } = req.params;
  const { novoEstoque } = req.body;

  try {
    const produtoAtualizado = await Produto.findOneAndUpdate(
      { id_produto: Number(id_produto) },
      { estoque: novoEstoque },
      { new: true }
    );

    if (!produtoAtualizado) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    res.json({ mensagem: 'Estoque atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Rota para excluir cliente (Bloqueia se for Cliente)
app.delete('/api/clientes/:id', async (req, res) => {
  const nivelAcesso = req.headers['user-level'];

  if (nivelAcesso === 'Client') {
    return res.status(403).json({ erro: 'Acesso negado: Clientes possuem apenas permissão de visualização e não podem excluir registros.' });
  }

  const { id } = req.params;
  try {
    const clienteDeletado = await Cliente.findOneAndDelete({ id_cliente: Number(id) });
    if (!clienteDeletado) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }
    res.json({ mensagem: 'Cliente excluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});