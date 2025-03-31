import sys
import json
import importlib

def main():
    """
    Script runner for gap generation methods.
    
    Command line args:
        method_id: The ID of the method (a, b, c, or d)
        input_path: Path to JSON file with input parameters
        output_path: Path to save the output JSON
    """
    if len(sys.argv) != 4:
        print("Usage: python method_runner.py <method_id> <input_path> <output_path>")
        sys.exit(1)
    
    method_id = sys.argv[1].lower()
    input_path = sys.argv[2]
    output_path = sys.argv[3]
    
    # Read input parameters
    with open(input_path, 'r') as f:
        params = json.load(f)
    
    passage_text = params.get('passage_text', '')
    num_gaps = params.get('num_gaps', 10)
    
    # Other parameters specific to the method
    method_params = {k: v for k, v in params.items() 
                    if k not in ['passage_text', 'num_gaps']}
    
    try:
        # Import the method module
        method_module = importlib.import_module(f"method_{method_id}")
        
        # Run the method
        result = method_module.generate_gaps(passage_text, num_gaps, **method_params)
        
        # Write the result to the output file
        with open(output_path, 'w') as f:
            json.dump(result, f)
        
        print(f"Successfully generated gaps using method {method_id}")
    except Exception as e:
        # Write error to output file
        with open(output_path, 'w') as f:
            json.dump({"error": str(e)}, f)
        
        print(f"Error running method {method_id}: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()