import sqlite3
import pandas as pd
import sys
import os
import json

def get_columns(file_path):
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(file_path, sep=None, engine='python', on_bad_lines='skip', nrows=1)
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path, nrows=1)
        else:
            return {"error": f"Format file {ext} tidak didukung."}
        
        return {"columns": list(df.columns)}
    except Exception as e:
        return {"error": str(e)}

def import_data(file_path, db_path, mapping_json):
    try:
        mapping = json.loads(mapping_json)
        # mapping format: {"nama": "KolomA", "kode": "KolomB", ...}
        
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(file_path, sep=None, engine='python', on_bad_lines='skip')
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            print(f"Error: Format file {ext} tidak didukung.")
            return

        # Connect to DB
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        success_count = 0
        error_count = 0

        # Rename columns based on mapping
        inv_mapping = {v: k for k, v in mapping.items() if v}
        df = df.rename(columns=inv_mapping)

        for _, row in df.iterrows():
            if 'nama' not in df.columns or pd.isna(row['nama']) or str(row['nama']).strip() == '' or str(row['nama']).lower() == 'nan':
                continue
                
            nama = str(row['nama']).strip()
            kode = str(row['kode']).strip() if 'kode' in df.columns and pd.notna(row['kode']) else None
            satuan = str(row['satuan']).strip() if 'satuan' in df.columns and pd.notna(row['satuan']) else 'pcs'
            
            try:
                harga_jual = int(row['harga_jual']) if 'harga_jual' in df.columns and pd.notna(row['harga_jual']) else 0
            except:
                harga_jual = 0

            try:
                if kode:
                    cursor.execute("SELECT id FROM barang WHERE kode = ?", (kode,))
                    if cursor.fetchone():
                        error_count += 1
                        continue

                cursor.execute(
                    "INSERT INTO barang (nama, kode, satuan, stok, harga_jual) VALUES (?, ?, ?, 0, ?)",
                    (nama, kode, satuan, harga_jual)
                )
                success_count += 1
            except Exception as e:
                error_count += 1
                continue

        conn.commit()
        conn.close()
        print(f"Success: Berhasil mengimpor {success_count} barang. Melewati {error_count} data.")

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python import_barang.py <cmd> <file_path> [db_path] [mapping_json]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "preview":
        result = get_columns(sys.argv[2])
        print(json.dumps(result))
    elif cmd == "import":
        import_data(sys.argv[2], sys.argv[3], sys.argv[4])
