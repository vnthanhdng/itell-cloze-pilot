import os
import argparse
from transformers import AutoTokenizer, AutoModelForMaskedLM
import spacy

def download_models(model_name="answerdotai/ModernBERT-large"):
    """Download required models for rational deletion method"""
    print(f"Downloading ML models required for the iTELL Cloze Test project...")
    
    # Create directories if they don't exist
    os.makedirs("models", exist_ok=True)
    
    # Download spaCy model
    print("Downloading spaCy model (en_core_web_sm)...")
    try:
        if not spacy.util.is_package("en_core_web_sm"):
            spacy.cli.download("en_core_web_sm")
        else:
            print("spaCy model already installed.")
    except Exception as e:
        print(f"Error downloading spaCy model: {e}")
        print("You can manually install it with: python -m spacy download en_core_web_sm")
    
    # Download transformer models
    print(f"Downloading transformer model: {model_name}...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForMaskedLM.from_pretrained(model_name)
        
        print(f"Successfully downloaded {model_name}")
    except Exception as e:
        print(f"Error downloading transformer model: {e}")
        print(f"You can manually download it later when running the application.")
    
    print("Setup complete!")
    print("\nNote: The models are cached in the Hugging Face cache directory.")
    print("You can now run the application with the required models available.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download required models for iTELL Cloze Test")
    parser.add_argument("--model", type=str, default="answerdotai/ModernBERT-large", 
                        help="Name of the HuggingFace model to use")
    
    args = parser.parse_args()
    download_models(args.model)