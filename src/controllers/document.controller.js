const Document = require('../models/document.model');
const { createCompletion } = require('../config/together.config');
const path = require('path');
const fs = require('fs');

/**
 * Upload a document
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No document uploaded'
      });
    }
    
    // Create document in database
    const document = await Document.create({
      title: req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname)),
      description: req.body.description || '',
      fileUrl: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      userId: req.user._id,
      tags: req.body.tags ? JSON.parse(req.body.tags) : []
    });
    
    res.status(201).json({
      status: 'success',
      document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all documents for a user
 */
exports.getUserDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .sort({ uploadedAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: documents.length,
      documents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single document by ID
 */
exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a document
 */
exports.updateDocument = async (req, res, next) => {
  try {
    const { title, description, tags, isPublic } = req.body;
    
    const document = await Document.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      {
        title,
        description,
        tags: tags ? JSON.parse(tags) : undefined,
        isPublic
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a document
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }
    
    // Delete file from filesystem if it exists
    if (document.fileUrl && fs.existsSync(document.fileUrl)) {
      fs.unlinkSync(document.fileUrl);
    }
    
    // Delete document from database
    await Document.findByIdAndDelete(document._id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze a document with AI
 */
exports.analyzeDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(document.fileUrl)) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document file not found'
      });
    }
    
    // Read file content
    const fileContent = fs.readFileSync(document.fileUrl, 'utf8');
    
    // Create prompt for AI
    const messages = [
      {
        role: 'system',
        content: 'You are CARA, a helpful Legal Assistant. Analyze the following document and provide insights about its legal implications, structure, and key points.'
      },
      {
        role: 'user',
        content: `Please analyze this document titled "${document.title}":\n\n${fileContent}`
      }
    ];
    
    // Get response from AI
    const completion = await createCompletion(messages, {
      max_tokens: 2500, // Increase token limit for document analysis
      temperature: 0.5 // Lower temperature for more factual responses
    });
    
    // Extract AI response
    const analysis = completion.choices[0].message.content;
    
    // Update document with analysis
    document.aiAnalysis = {
      analysis,
      analyzedAt: Date.now()
    };
    
    await document.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        documentId: document._id,
        analysis
      }
    });
  } catch (error) {
    console.error('Document Analysis Error:', error);
    next(error);
  }
}; 