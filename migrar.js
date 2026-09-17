import mongoose from 'mongoose';
import mysql from 'mysql2/promise';

const mongoURI = "mongodb+srv://kaua:Kaua4595@kauaalbuquerquedosanjos.myryjlm.mongodb.net/?appName=KauaAlbuquerquedosAnjos";
const mysqlConfig = { host: 'localhost', user: 'root', password: '1234', database: 'techshop' };

const produtoSchema = new mongoose.Schema({ id_produto: Number, nome_produto: String, estoque: Number, preco: Number, categoria: String });
const Produto = mongoose.model('Produto', produtoSchema);

const clienteSchema = new mongoose.Schema({ id_cliente: Number, nome: String, email: String, telefone: String });
const Cliente = mongoose.model('Cliente', clienteSchema);

const itemPedidoSchema = new mongoose.Schema({ id_produto: Number, quantidade: Number, preco_unitario: Number });
const pedidoSchema = new mongoose.Schema({ id_pedido: Number, id_cliente: Number, status_pedido: String, itens: [itemPedidoSchema] });
const Pedido = mongoose.model('Pedido', pedidoSchema);

async function migrar() {
  try {
    console.log("Conectando ao MongoDB Atlas...");
    await mongoose.connect(mongoURI);
    
    console.log("Conectando ao MySQL local...");
    const conn = await mysql.createConnection(mysqlConfig);

    const [clientes] = await conn.query('SELECT * FROM clientes');
    await Cliente.deleteMany({});
    await Cliente.insertMany(clientes);

    const [produtos] = await conn.query('SELECT * FROM produtos');
    await Produto.deleteMany({});
    await Produto.insertMany(produtos);

    const [pedidos] = await conn.query('SELECT * FROM pedidos');
    await Pedido.deleteMany({});
    for (const p of pedidos) {
      const [itens] = await conn.query('SELECT * FROM itens_pedido WHERE id_pedido = ?', [p.id_pedido]);
      await Pedido.create({
        id_pedido: p.id_pedido,
        id_cliente: p.id_cliente,
        status_pedido: p.status_pedido,
        itens: itens
      });
    }

    console.log("🎉 SUCESSO! Dados migrados do MySQL para o MongoDB Atlas!");
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error("Erro na migração:", err);
    process.exit(1);
  }
}

migrar();