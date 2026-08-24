import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryProductImageService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.requiredConfig('CLOUDINARY_CLOUD_NAME'),
      api_key: this.requiredConfig('CLOUDINARY_API_KEY'),
      api_secret: this.requiredConfig('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  uploadProductImage(productId: string, file: Express.Multer.File) {
    this.ensureImageFile(file);

    const folder = this.configService.get<string>(
      'CLOUDINARY_PRODUCT_FOLDER',
      'bluewave/products',
    );

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${folder}/${productId}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new InternalServerErrorException('Cloudinary upload failed'));
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId?: string | null) {
    if (!publicId) {
      return;
    }

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
  }

  private ensureImageFile(file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files can be uploaded');
    }

    const maxSizeMb = Number(
      this.configService.get<string>('MAX_PRODUCT_IMAGE_SIZE_MB', '5'),
    );
    const maxBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new BadRequestException(`Image must be ${maxSizeMb}MB or smaller`);
    }
  }

  private requiredConfig(key: string) {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is required`);
    }

    return value;
  }
}
