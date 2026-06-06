
import pandas as pd
import shutil
from pathlib import Path
import random

# Local Paths
BASE_DIR = Path(r"C:\Users\omptl\Downloads\archive")
ATTR_FILE = BASE_DIR / "list_attr_celeba.csv"
IMAGE_DIR = BASE_DIR / "img_align_celeba" / "img_align_celeba"
OUTPUT_DIR = BASE_DIR / "teachable_machine_data"

# Settings
TRAIN_IMAGES_PER_CLASS = 100
TEST_IMAGES_PER_CLASS = 50
RANDOM_SEED = 42

random.seed(RANDOM_SEED)

# Each entry means:
# output folder name: (CelebA attribute column, positive class name, negative class name)
CLASSIFIERS = {
    "male_female": ("Male", "male", "female"),
    "young_old": ("Young", "young", "old"),
    "glasses_no_glasses": ("Eyeglasses", "glasses", "no_glasses"),
}


def load_attributes(attr_file: Path) -> pd.DataFrame:
    """
    Loads the CelebA attribute file.
    Works with either a CSV-style file or the original space-separated CelebA txt format.
    """

    if not attr_file.exists():
        raise FileNotFoundError(f"Could not find attribute file: {attr_file}")

    if attr_file.suffix.lower() == ".csv":
        df = pd.read_csv(attr_file)
    else:
        # Original CelebA format:
        # first line = number of images
        # second line = column names
        df = pd.read_csv(attr_file, delim_whitespace=True, skiprows=1)

    # Some versions call the filename column image_id, some use the first unnamed column
    if "image_id" not in df.columns:
        first_col = df.columns[0]
        df = df.rename(columns={first_col: "image_id"})

    return df


def copy_images_for_class(
    df: pd.DataFrame,
    attribute: str,
    attribute_value: int,
    output_folder: Path,
    total_needed: int
):
    """
    Selects images where the chosen CelebA attribute is 1 or -1
    and copies them into the required output folder.
    """

    matching_rows = df[df[attribute] == attribute_value].copy()

    # Shuffle so we do not always take the first images in the dataset
    matching_rows = matching_rows.sample(frac=1, random_state=RANDOM_SEED)

    copied = 0

    for _, row in matching_rows.iterrows():
        image_name = row["image_id"]
        source_path = IMAGE_DIR / image_name
        destination_path = output_folder / image_name

        if source_path.exists():
            shutil.copy2(source_path, destination_path)
            copied += 1

        if copied >= total_needed:
            break

    if copied < total_needed:
        print(f"Warning: only copied {copied}/{total_needed} images to {output_folder}")
    else:
        print(f"Copied {copied} images to {output_folder}")


def prepare_classifier_folders(df: pd.DataFrame, folder_name: str, attribute: str, positive_class: str, negative_class: str):
    """
    Creates train/test folders for one binary classifier.
    """

    print(f"\nPreparing classifier: {folder_name}")
    print(f"Using CelebA attribute: {attribute}")

    total_needed = TRAIN_IMAGES_PER_CLASS + TEST_IMAGES_PER_CLASS

    class_info = [
        (positive_class, 1),
        (negative_class, -1),
    ]

    for class_name, attribute_value in class_info:
        class_base = OUTPUT_DIR / folder_name

        train_folder = class_base / "train" / class_name
        test_folder = class_base / "test" / class_name

        train_folder.mkdir(parents=True, exist_ok=True)
        test_folder.mkdir(parents=True, exist_ok=True)

        # Temporary folder to collect selected images first
        temp_folder = class_base / "_temp" / class_name
        temp_folder.mkdir(parents=True, exist_ok=True)

        copy_images_for_class(
            df=df,
            attribute=attribute,
            attribute_value=attribute_value,
            output_folder=temp_folder,
            total_needed=total_needed
        )

        selected_images = list(temp_folder.glob("*.jpg"))
        random.shuffle(selected_images)

        train_images = selected_images[:TRAIN_IMAGES_PER_CLASS]
        test_images = selected_images[TRAIN_IMAGES_PER_CLASS:TRAIN_IMAGES_PER_CLASS + TEST_IMAGES_PER_CLASS]

        for image_path in train_images:
            shutil.move(str(image_path), train_folder / image_path.name)

        for image_path in test_images:
            shutil.move(str(image_path), test_folder / image_path.name)

        print(f"{class_name}: {len(train_images)} train images, {len(test_images)} test images")

    # Remove temporary folder
    temp_root = OUTPUT_DIR / folder_name / "_temp"
    if temp_root.exists():
        shutil.rmtree(temp_root)


def main():
    print("Loading CelebA attributes...")
    df = load_attributes(ATTR_FILE)

    print(f"Loaded {len(df)} rows.")
    print(f"Image folder: {IMAGE_DIR}")
    print(f"Output folder: {OUTPUT_DIR}")

    if not IMAGE_DIR.exists():
        raise FileNotFoundError(f"Could not find image folder: {IMAGE_DIR}")

    for folder_name, details in CLASSIFIERS.items():
        attribute, positive_class, negative_class = details

        if attribute not in df.columns:
            raise ValueError(f"Attribute '{attribute}' was not found in the attribute file.")

        prepare_classifier_folders(
            df=df,
            folder_name=folder_name,
            attribute=attribute,
            positive_class=positive_class,
            negative_class=negative_class
        )

    print("\nDone. Dataset folders have been created successfully.")


if __name__ == "__main__":
    main()