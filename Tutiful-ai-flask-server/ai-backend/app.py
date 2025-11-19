import os
import queue
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import requests
from dotenv import load_dotenv

from paper_generation_service import (
    PaperGenerationError,
    generate_primary6_math_pdf,
    get_available_topics,
    is_supported_subject,
    normalize_topics,
)

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Internal event queue
paper_queue = queue.Queue()

def send_expo_push_notification(expo_push_token, title, body, data=None):
    """Send push notification via Expo"""
    if not expo_push_token:
        print("No push token provided, skipping notification")
        return
    
    try:
        message = {
            'to': expo_push_token,
            'sound': 'default',
            'title': title,
            'body': body,
            'data': data or {}
        }
        
        response = requests.post(
            EXPO_PUSH_URL,
            json=message,
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        )
        
        print(f"Expo API Response Status: {response.status_code}")
        print(f"Expo API Response Body: {response.text}")
        
        if response.status_code == 200:
            print(f"Push notification sent successfully to {expo_push_token}")
        else:
            print(f"Failed to send push notification: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error sending push notification: {str(e)}")


def mark_paper_failed(paper_id, expo_push_token, body_message):
    """Update the paper status and optionally notify the tutor."""
    try:
        supabase.table('generated_papers').update({
            'status': 'failed'
        }).eq('id', paper_id).execute()

        if expo_push_token:
            send_expo_push_notification(
                expo_push_token,
                'Paper Generation Failed',
                body_message,
                {
                    'type': 'paper_failed',
                    'paperId': paper_id
                }
            )
    except Exception as update_error:
        print(f"Failed to update failure status for {paper_id}: {str(update_error)}")


def process_paper_generation(paper_data):
    """
    Worker function to process paper generation from the queue.
    This runs in a separate thread.
    """
    paper_id = paper_data['id']
    tutor_id = paper_data['tutorId']
    subject_id = paper_data['subjectId']
    topics = paper_data['topics']
    expo_push_token = paper_data.get('expoPushToken')
    subject_name = paper_data.get('subjectName')
    grade_level = paper_data.get('gradeLevel')
    topics_list = paper_data.get('topicsList')
    
    try:
        print(f"Processing paper generation for ID: {paper_id}")
        
        # Update status to 'processing'
        supabase.table('generated_papers').update({
            'status': 'processing'
        }).eq('id', paper_id).execute()
        
        if not subject_name or not grade_level:
            subject_response = supabase.table('subjects').select('name, gradeLevel').eq('id', subject_id).single().execute()
            if not subject_response.data:
                raise PaperGenerationError("Subject details could not be found.")
            subject_name = subject_response.data['name']
            grade_level = subject_response.data['gradeLevel']

        if not topics_list:
            topics_list = normalize_topics(topics)
        
        # Generate the practice paper (calls your AI pipeline)
        print(f"Generating paper for {subject_name} - {grade_level}, Topics: {topics_list}")
        pdf_buffer, metadata = generate_primary6_math_pdf(subject_name, grade_level, topics_list)
        
        # Upload to Supabase Storage
        filename = f"{paper_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        storage_path = f"{tutor_id}/{filename}"
        
        print(f"Uploading to storage: {storage_path}")
        supabase.storage.from_('generatedPapers').upload(
            path=storage_path,
            file=pdf_buffer.read(),
            file_options={
                'content-type': 'application/pdf',
                'upsert': 'true'
            }
        )
        
        # Get public download URL
        download_url = supabase.storage.from_('generatedPapers').get_public_url(storage_path)
        
        print(f"Paper uploaded successfully. Download URL: {download_url}")
        
        # Update database record with download URL and status
        supabase.table('generated_papers').update({
            'downloadUrl': download_url,
            'status': 'completed',
            'topics': metadata.get('topics', ', '.join(topics_list))
        }).eq('id', paper_id).execute()
        
        # Send push notification
        if expo_push_token:
            send_expo_push_notification(
                expo_push_token,
                'Paper Ready!',
                f'Your {subject_name} practice paper is ready to download.',
                {
                    'type': 'paper_completed',
                    'paperId': paper_id,
                    'downloadUrl': download_url
                }
            )
        
        print(f"Paper generation completed successfully for ID: {paper_id}")
        
    except PaperGenerationError as gen_error:
        print(f"Paper generation error for {paper_id}: {str(gen_error)}")
        mark_paper_failed(paper_id, expo_push_token, str(gen_error))
    except Exception as e:
        print(f"Error processing paper {paper_id}: {str(e)}")
        mark_paper_failed(
            paper_id,
            expo_push_token,
            'There was an error generating your practice paper. Please try again.'
        )


def queue_worker():
    """
    Background worker that continuously polls the queue and processes jobs.
    Runs in a separate thread.
    """
    print("Queue worker started")
    while True:
        try:
            # Get paper data from queue (blocks until item is available)
            paper_data = paper_queue.get()
            
            # Process the paper generation
            process_paper_generation(paper_data)
            
            # Mark task as done
            paper_queue.task_done()
            
        except Exception as e:
            print(f"Queue worker error: {str(e)}")


# Start the background worker thread
worker_thread = threading.Thread(target=queue_worker, daemon=True)
worker_thread.start()


@app.route('/available-topics', methods=['GET'])
def available_topics():
    """
    Expose the list of Primary 6 Mathematics topics supported by the AI generator.
    """
    try:
        topics = get_available_topics()
        return jsonify({
            'topics': topics,
            'count': len(topics)
        })
    except Exception as e:
        return jsonify({'error': f'Failed to fetch topics: {str(e)}'}), 500


@app.route('/generate-paper', methods=['POST'])
def generate_paper():
    """
    Main endpoint to request paper generation.
    
    Request body:
    {
        "tutorId": "uuid",
        "subjectId": "uuid",
        "topics": "comma-separated topics",
        "expoPushToken": "ExponentPushToken[...]" (optional)
    }
    """
    try:
        # Extract data from request
        data = request.get_json()
        
        tutor_id = data.get('tutorId')
        subject_id = data.get('subjectId')
        topics = data.get('topics')
        expo_push_token = data.get('expoPushToken')
        
        # Validate required fields
        if not tutor_id or not subject_id or not topics:
            return jsonify({
                'error': 'Missing required fields: tutorId, subjectId, topics'
            }), 400

        subject_response = supabase.table('subjects').select('name, gradeLevel').eq('id', subject_id).single().execute()
        if not subject_response.data:
            return jsonify({
                'error': 'Subject not found for the provided subjectId.'
            }), 404

        subject_name = subject_response.data['name']
        grade_level = subject_response.data['gradeLevel']

        if not is_supported_subject(subject_name, grade_level):
            return jsonify({
                'error': 'Only Primary 6 Mathematics papers can be generated right now.'
            }), 400

        try:
            canonical_topics = normalize_topics(topics)
        except PaperGenerationError as topic_error:
            return jsonify({
                'error': str(topic_error)
            }), 400

        topics_string = ', '.join(canonical_topics)
        
        # Create record in generated_papers table
        paper_record = {
            'tutorId': tutor_id,
            'subjectId': subject_id,
            'topics': topics_string,
            'expoPushToken': expo_push_token,
        }
        
        # Insert into database
        result = supabase.table('generated_papers').insert(paper_record).execute()
        paper_id = result.data[0]['id']
        
        print(f"Created paper record with ID: {paper_id}")
        
        # Add to queue for processing
        paper_queue.put({
            'id': paper_id,
            'tutorId': tutor_id,
            'subjectId': subject_id,
            'topics': topics_string,
            'topicsList': canonical_topics,
            'subjectName': subject_name,
            'gradeLevel': grade_level,
            'expoPushToken': expo_push_token
        })
        
        print(f"Added paper {paper_id} to processing queue")
        
        # Return success response immediately
        return jsonify({
            'success': True,
            'message': 'Paper generation request queued successfully',
            'paperId': paper_id,
            'status': 'pending'
        }), 202  # 202 Accepted - request accepted for processing
        
    except Exception as e:
        print(f"Error in generate_paper endpoint: {str(e)}")
        return jsonify({
            'error': f'Failed to queue paper generation: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("Starting Flask AI Backend Server...")
    print(f"Queue worker running in background thread")
    app.run(host='0.0.0.0', port=5000, debug=False)  # debug=False for production
