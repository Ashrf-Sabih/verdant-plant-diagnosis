import zipfile
import pathlib

# مسار الفولدر اللي جواه الملفات الثلاثة (عدل المسار ده لمكان الفولدر عندك)
folder_path = pathlib.Path(r"D:\plant-disease-app\backend\model\plant_disease_cnn.keras")
output_file = pathlib.Path(r"D:\plant-disease-app\backend\model\plant_disease_model.keras")

with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file in folder_path.rglob('*'):
        if file.is_file():
            zipf.write(file, file.relative_to(folder_path))

print("تم ضغط الملفات بنجاح وبقى جاهز كملف .keras واحد!")