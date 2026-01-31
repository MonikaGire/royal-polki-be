const Materials = require('../models/Material');
const getBlurDataURL = require('../config/getBlurDataURL');
const { singleFileDelete } = require('../config/uploader');

const createMaterial = async (req, res) => {
  try {
    const { logo, ...others } = req.body;

    // Validate if the 'logo' property and its 'url' property exist in the request body
    if (!logo || !logo.url) {
      return res.status(400).json({ message: 'Invalid Logo Data' });
    }

    // Validate if the 'blurDataURL' property exists in the logo object

    // If blurDataURL is not provided, generate it using the 'getBlurDataURL' function
    const blurDataURL = await getBlurDataURL(logo.url);

    // Creating a new material
    const newMaterial = await Materials.create({
      ...others,
      logo: {
        ...logo,
        blurDataURL,
      },
      totalItems: 0,
    });

    res
      .status(201)
      .json({ success: true, data: newMaterial, message: 'Material Created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllMaterials = async (req, res) => {
  try {
    const materials = await Materials.find()
      .sort({
        createdAt: -1,
      })
      .select(['name']);

    res.status(201).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMaterialBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const material = await Materials.findOne({ slug });

    if (!material) {
      return res.status(404).json({ message: 'Material Not Found' });
    }

    res.status(201).json({
      success: true,
      data: material,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateMaterialBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { logo, ...others } = req.body;
    // Validate if the 'blurDataURL' property exists in the logo object
    if (!logo.blurDataURL) {
      // If blurDataURL is not provided, generate it using the 'getBlurDataURL' function
      logo.blurDataURL = await getBlurDataURL(logo.url);
    }
    const updatedMaterial = await Materials.findOneAndUpdate(
      { slug },
      {
        ...others,
        logo: {
          ...logo,
        },
        totalItems: 0,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedMaterial) {
      return res.status(404).json({ message: 'Brand Not Found' });
    }

    res
      .status(201)
      .json({ success: true, data: updatedMaterial, message: 'Material Updated' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteMaterialBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const material = await Materials.findOne({ slug });

    if (!material) {
      return res.status(404).json({ message: 'Material Not Found' });
    }
    // Uncomment the line below if you have a function to delete the logo file
    const dataaa = await singleFileDelete(material?.logo?._id);

    await Brands.deleteOne({ slug });

    res.status(201).json({ success: true, message: 'Material Deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getMaterials = async (req, res) => {
  try {
    const materials = await Materials.find().sort({
      createdAt: -1,
    });

    res.status(201).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createMaterial,
  getAllMaterials,
  getMaterialBySlug,
  updateMaterialBySlug,
  deleteMaterialBySlug,
  getMaterials,
};
