import json
import sys
import os

# Path to the JSONL file
JSONL_PATH = os.path.join(os.path.dirname(__file__), '../../data/passages.jsonl')

def load_jsonl_data():
    """Load the JSONL file into a dictionary indexed by volume and page"""
    passages = {}
    with open(JSONL_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            key = f"{data['volume']}/{data['page']}"
            passages[key] = data
    return passages

def method_a(passage_text, num_gaps=10, **kwargs):
    """Method A: contextuality"""
    # Get passage ID from the passage text or kwargs
    passage_id = kwargs.get('passage_id', '1')
    
    # Load data from JSONL
    passages = load_jsonl_data()
    
    # Find matching passage
    passage_data = None
    for key, data in passages.items():
        if data.get('text', '').strip() == passage_text.strip():
            passage_data = data
            break
    
    if not passage_data or 'contextuality' not in passage_data:
        return fallback_method(passage_text, num_gaps)
    
    # Extract gap data from contextuality field
    gaps = []
    contextuality_text = passage_data['contextuality']['text']
    contextuality_gaps = passage_data['contextuality']['gaps']
    
    for gap_info in contextuality_gaps:
        word = gap_info[0]
        start_idx = gap_info[1]
        length = gap_info[2]
        
        # Calculate context (30 chars before and after)
        context_start = max(0, start_idx - 30)
        context_end = min(len(contextuality_text), start_idx + length + 30)
        context = contextuality_text[context_start:context_end].replace(word, "_____")
        
        gaps.append({
            'word': word,
            'start_idx': start_idx,
            'end_idx': start_idx + length,
            'context': context,
            'method': 'contextuality'
        })
    
    # Limit to requested number of gaps
    return gaps[:int(num_gaps)]

def method_b(passage_text, num_gaps=10, **kwargs):
    """Method B: contextuality_plus"""
    # Similar to method_a but using contextuality_plus field
    passage_id = kwargs.get('passage_id', '1')
    passages = load_jsonl_data()
    
    passage_data = None
    for key, data in passages.items():
        if data.get('text', '').strip() == passage_text.strip():
            passage_data = data
            break
    
    if not passage_data or 'contextuality_plus' not in passage_data:
        return fallback_method(passage_text, num_gaps)
    
    gaps = []
    contextuality_text = passage_data['contextuality_plus']['text']
    contextuality_gaps = passage_data['contextuality_plus']['gaps']
    
    for gap_info in contextuality_gaps:
        word = gap_info[0]
        start_idx = gap_info[1]
        length = gap_info[2]
        
        context_start = max(0, start_idx - 30)
        context_end = min(len(contextuality_text), start_idx + length + 30)
        context = contextuality_text[context_start:context_end].replace(word, "_____")
        
        gaps.append({
            'word': word,
            'start_idx': start_idx,
            'end_idx': start_idx + length,
            'context': context,
            'method': 'contextuality_plus'
        })
    
    return gaps[:int(num_gaps)]

def method_c(passage_text, num_gaps=10, **kwargs):
    """Method C: keyword"""
    # Similar to methods above but using keyword field
    passage_id = kwargs.get('passage_id', '1')
    passages = load_jsonl_data()
    
    passage_data = None
    for key, data in passages.items():
        if data.get('text', '').strip() == passage_text.strip():
            passage_data = data
            break
    
    if not passage_data or 'keyword' not in passage_data:
        return fallback_method(passage_text, num_gaps)
    
    gaps = []
    keyword_text = passage_data['keyword']['text']
    keyword_gaps = passage_data['keyword']['gaps']
    
    for gap_info in keyword_gaps:
        word = gap_info[0]
        start_idx = gap_info[1]
        length = gap_info[2]
        
        context_start = max(0, start_idx - 30)
        context_end = min(len(keyword_text), start_idx + length + 30)
        context = keyword_text[context_start:context_end].replace(word, "_____")
        
        gaps.append({
            'word': word,
            'start_idx': start_idx,
            'end_idx': start_idx + length,
            'context': context,
            'method': 'keyword'
        })
    
    return gaps[:int(num_gaps)]

def method_d(passage_text, num_gaps=10, **kwargs):
    """Method D: human-generated gaps (fallback to simple algorithm)"""
    # For now, this can be a modified version of the fallback
    words = passage_text.split()
    gaps = []
    
    # Select every 9th word starting from the 4th word
    for i in range(3, len(words), 9):
        if len(gaps) >= int(num_gaps):
            break
            
        word = words[i].strip('.,;:!?')
        if len(word) > 3:  # Only gap words that are longer than 3 chars
            # Find position in original text
            start_idx = passage_text.find(word)
            if start_idx != -1:
                # Calculate context
                context_start = max(0, start_idx - 30)
                context_end = min(len(passage_text), start_idx + len(word) + 30)
                context = passage_text[context_start:context_end].replace(word, "_____")
                
                gaps.append({
                    'word': word,
                    'start_idx': start_idx,
                    'end_idx': start_idx + len(word),
                    'context': context,
                    'method': 'human-like',
                    'hints': ['_' * len(word)]  # No hints
                })
    
    return gaps

def fallback_method(passage_text, num_gaps=10):
    """Simple fallback method if JSONL data isn't available"""
    words = passage_text.split()
    gaps = []
    
    # Every 7th word from the 3rd word
    for i in range(2, len(words), 7):
        if len(gaps) >= int(num_gaps):
            break
            
        word = words[i].strip('.,;:!?')
        if len(word) > 2:  # Only consider words longer than 2 chars
            # Find position in original text
            start_idx = passage_text.find(word)
            if start_idx != -1:
                # Calculate context
                context_start = max(0, start_idx - 30)
                context_end = min(len(passage_text), start_idx + len(word) + 30)
                context = passage_text[context_start:context_end].replace(word, "_____")
                
                gaps.append({
                    'word': word,
                    'start_idx': start_idx,
                    'end_idx': start_idx + len(word),
                    'context': context,
                    'method': 'fallback'
                })
    
    return gaps

if __name__ == "__main__":
    # Get method, input file, and output file from command line arguments
    if len(sys.argv) != 4:
        print("Usage: python method_runner.py <method> <input_json> <output_json>")
        sys.exit(1)
        
    method_name = sys.argv[1].lower()
    input_file = sys.argv[2]
    output_file = sys.argv[3]
    
    # Read input parameters
    with open(input_file, 'r') as f:
        params = json.load(f)
    
    # Execute the requested method
    if method_name == 'a':
        result = method_a(**params)
    elif method_name == 'b':
        result = method_b(**params)
    elif method_name == 'c':
        result = method_c(**params)
    elif method_name == 'd':
        result = method_d(**params)
    else:
        result = fallback_method(**params)
    
    # Write the result to the output file
    with open(output_file, 'w') as f:
        json.dump(result, f)