#!/bin/bash

output_dir="./txtfiles"

find . -type f \
    ! -name "*.txt" \
    ! -name "*.sh" \
    | while IFS= read -r f; do
    file="$(basename "$f")"
    # Replace periods with underscores
    safe="${file//./_}"
    # Add .txt extension so index.html becomes index_html.txt
    new="${output_dir}/${safe}.txt"
    
    cat "$f" > "$new"
    echo "Wrote $new"
done