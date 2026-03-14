const {
	shop,
	shopSales,
	customer,
} = require("../models");
const { Op } = require("sequelize");
const generateId = require("../helpers/idGen");

const toNumber = (value) => parseFloat(value || 0);

// Create a new shop
exports.createShop = async (req, res) => {
	const t = await shop.sequelize.transaction();
	try {
		const {
			name,
			location,
			contact_number,
			owner_name,
			owner_customer_id,
			shop_id,
		} = req.body;

		if (!name || !location || !contact_number || !owner_name || !owner_customer_id) {
			await t.rollback();
			return res.status(400).json({
				success: false,
				message:
					"Name, location, contact number, owner name, and owner customer ID are required",
			});
		}

		const owner = await customer.findByPk(owner_customer_id, { transaction: t });
		if (!owner) {
			await t.rollback();
			return res.status(404).json({
				success: false,
				message: "Owner customer not found",
			});
		}

		const newShopId = shop_id || (await generateId("SHOP", t));

		const existingShop = await shop.findByPk(newShopId, { transaction: t });
		if (existingShop) {
			await t.rollback();
			return res.status(400).json({
				success: false,
				message: "Shop ID already exists",
			});
		}

		const newShop = await shop.create(
			{
				shop_id: newShopId,
				name,
				location,
				contact_number,
				owner_name,
				owner_customer_id,
			},
			{ transaction: t }
		);

		const salesRecord = await shopSales.create(
			{
				shop_id: newShopId,
				total_sales: 0,
				total_paid: 0,
				total_outstanding: 0,
				total_devices: 0,
				active_devices: 0,
				sold_devices: 0,
			},
			{ transaction: t }
		);

		await t.commit();

		return res.status(201).json({
			success: true,
			message: "Shop created successfully",
			data: {
				...newShop.toJSON(),
				sales: salesRecord,
			},
		});
	} catch (error) {
		await t.rollback();
		return res.status(500).json({
			success: false,
			message: "Error creating shop",
			error: error.message,
		});
	}
};

// Get shop by ID
exports.getShopById = async (req, res) => {
	const t = await shop.sequelize.transaction();
	try {
		const shopData = await shop.findByPk(req.params.id, {
			include: [
				{
					model: shopSales,
					as: "sales",
				},
			],
			transaction: t,
		});

		if (!shopData) {
			await t.rollback();
			return res.status(404).json({
				success: false,
				message: "Shop not found",
			});
		}

		await t.commit();

		return res.status(200).json({
			success: true,
			data: shopData,
		});
	} catch (error) {
		await t.rollback();
		return res.status(500).json({
			success: false,
			message: "Error fetching shop",
			error: error.message,
		});
	}
};

// Get all shops
exports.getAllShops = async (req, res) => {
	const t = await shop.sequelize.transaction();
	try {
		const limit = parseInt(req.query.limit, 10) || 100;
		const { owner_customer_id, location } = req.query;

		const whereClause = {};
		if (owner_customer_id) whereClause.owner_customer_id = owner_customer_id;
		if (location) whereClause.location = { [Op.like]: `%${location}%` };

		const shops = await shop.findAll({
			where: whereClause,
			include: [
				{
					model: shopSales,
					as: "sales",
				},
			],
			limit,
			order: [["createdAt", "DESC"]],
			transaction: t,
		});

		const stats = shops.reduce(
			(acc, currentShop) => {
				const sales = currentShop.sales;
				acc.total_shops += 1;
				acc.total_sales += sales ? toNumber(sales.total_sales) : 0;
				acc.total_devices += sales ? toNumber(sales.total_devices) : 0;
				acc.total_paid += sales ? toNumber(sales.total_paid) : 0;
				acc.total_outstanding += sales ? toNumber(sales.total_outstanding) : 0;
				return acc;
			},
			{
				total_shops: 0,
				total_sales: 0,
				total_devices: 0,
				total_paid: 0,
				total_outstanding: 0,
			}
		);

		await t.commit();

		return res.status(200).json({
			success: true,
			data: shops,
			stats,
			isAll: shops.length < limit,
		});
	} catch (error) {
		await t.rollback();
		return res.status(500).json({
			success: false,
			message: "Error fetching shops",
			error: error.message,
		});
	}
};

// Search shops
exports.searchShops = async (req, res) => {
	const t = await shop.sequelize.transaction();
	try {
		const { query } = req.query;

		if (!query) {
			await t.rollback();
			return res.status(400).json({
				success: false,
				message: "Search query is required",
			});
		}

		const shops = await shop.findAll({
			where: {
				[Op.or]: [
					{ shop_id: { [Op.like]: `%${query}%` } },
					{ name: { [Op.like]: `%${query}%` } },
					{ location: { [Op.like]: `%${query}%` } },
					{ contact_number: { [Op.like]: `%${query}%` } },
					{ owner_name: { [Op.like]: `%${query}%` } },
					{ owner_customer_id: { [Op.like]: `%${query}%` } },
				],
			},
			include: [
				{
					model: shopSales,
					as: "sales",
				},
			],
			transaction: t,
		});

		await t.commit();

		return res.status(200).json({
			success: true,
			data: shops,
			count: shops.length,
		});
	} catch (error) {
		await t.rollback();
		return res.status(500).json({
			success: false,
			message: "Error searching shops",
			error: error.message,
		});
	}
};

// Update shop
exports.updateShop = async (req, res) => {
	const t = await shop.sequelize.transaction();
	try {
		const shopData = await shop.findByPk(req.params.id, { transaction: t });

		if (!shopData) {
			await t.rollback();
			return res.status(404).json({
				success: false,
				message: "Shop not found",
			});
		}

		const { shop_id, owner_customer_id, ...updateData } = req.body;

		if (owner_customer_id) {
			const owner = await customer.findByPk(owner_customer_id, { transaction: t });
			if (!owner) {
				await t.rollback();
				return res.status(404).json({
					success: false,
					message: "Owner customer not found",
				});
			}
			updateData.owner_customer_id = owner_customer_id;
		}

		await shopData.update(updateData, { transaction: t });

		await t.commit();

		return res.status(200).json({
			success: true,
			message: "Shop updated successfully",
			data: shopData,
		});
	} catch (error) {
		await t.rollback();
		return res.status(500).json({
			success: false,
			message: "Error updating shop",
			error: error.message,
		});
	}
};

// Delete shop
exports.deleteShop = async (req, res) => {
	const t = await shop.sequelize.transaction();
	try {
		const shopData = await shop.findByPk(req.params.id, { transaction: t });

		if (!shopData) {
			await t.rollback();
			return res.status(404).json({
				success: false,
				message: "Shop not found",
			});
		}

		await shopData.destroy({ transaction: t });

		await t.commit();

		return res.status(200).json({
			success: true,
			message: "Shop deleted successfully",
		});
	} catch (error) {
		await t.rollback();
		return res.status(500).json({
			success: false,
			message: "Error deleting shop",
			error: error.message,
		});
	}
};

// Get shop sales summary
exports.getShopSalesSummary = async (req, res) => {
	const t = await shop.sequelize.transaction();
	try {
		const shopData = await shop.findByPk(req.params.id, { transaction: t });

		if (!shopData) {
			await t.rollback();
			return res.status(404).json({
				success: false,
				message: "Shop not found",
			});
		}

		const [salesData] = await shopSales.findOrCreate({
			where: { shop_id: req.params.id },
			defaults: {
				shop_id: req.params.id,
				total_sales: 0,
				total_paid: 0,
				total_outstanding: 0,
				total_devices: 0,
				active_devices: 0,
				sold_devices: 0,
			},
			transaction: t,
		});

		await t.commit();

		return res.status(200).json({
			success: true,
			data: {
				shop: shopData,
				summary: {
					recorded_sales_row: salesData,
				},
			},
		});
	} catch (error) {
		await t.rollback();
		return res.status(500).json({
			success: false,
			message: "Error fetching shop sales summary",
			error: error.message,
		});
	}
};
