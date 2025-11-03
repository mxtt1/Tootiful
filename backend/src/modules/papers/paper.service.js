import { GeneratedPaper, User, Subject } from "../../models/index.js";

class PaperService {
  // Get all papers for a tutor
  async handleGetPapersByTutorId(req, res) {
    const { tutorId } = req.params;
    console.log(`Fetching papers for tutor: ${tutorId}`);
    
    const papers = await this.getPapersByTutorId(tutorId);
    console.log(`Retrieved ${papers.length} papers for tutor ${tutorId}`);
    
    res.status(200).json({
      success: true,
      data: papers,
    });
  }

  // Get a single paper by ID
  async handleGetPaperById(req, res) {
    const { id } = req.params;
    console.log(`Fetching paper by ID: ${id}`);
    
    const paper = await this.getPaperById(id);
    console.log(`Retrieved paper: ${paper.id}`);
    
    res.status(200).json({
      success: true,
      data: paper,
    });
  }

  // Business logic methods
  async getPapersByTutorId(tutorId) {
    try {
      const papers = await GeneratedPaper.findAll({
        where: { tutorId },
        include: [
          {
            model: User,
            as: "tutor",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: Subject,
            as: "subject",
            attributes: ["id", "name", "gradeLevel"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      // Flatten the structure
      return papers.map(paper => {
        const paperJson = paper.toJSON();
        return {
          id: paperJson.id,
          status: paperJson.status,
          downloadUrl: paperJson.downloadUrl,
          topics: paperJson.topics,
          created_at: paperJson.created_at,
          subject: paperJson.subject?.name || null,
          gradeLevel: paperJson.subject?.gradeLevel || null,
          tutor: paperJson.tutor,
        };
      });
    } catch (error) {
      console.error(`Failed to fetch papers for tutor ${tutorId}:`, error.message);
      throw new Error(`Failed to fetch papers: ${error.message}`);
    }
  }

  async getPaperById(paperId) {
    try {
      const paper = await GeneratedPaper.findByPk(paperId, {
        include: [
          {
            model: User,
            as: "tutor",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: Subject,
            as: "subject",
            attributes: ["id", "name", "gradeLevel"],
          },
        ],
      });

      if (!paper) {
        throw new Error("Paper not found");
      }

      // Flatten the structure
      const paperJson = paper.toJSON();
      return {
        id: paperJson.id,
        status: paperJson.status,
        downloadUrl: paperJson.downloadUrl,
        topics: paperJson.topics,
        created_at: paperJson.created_at,
        subject: paperJson.subject?.name || null,
        gradeLevel: paperJson.subject?.gradeLevel || null,
        tutor: paperJson.tutor,
      };
    } catch (error) {
      console.error(`Failed to fetch paper ${paperId}:`, error.message);
      throw new Error(`Failed to fetch paper: ${error.message}`);
    }
  }
}
export default PaperService;
