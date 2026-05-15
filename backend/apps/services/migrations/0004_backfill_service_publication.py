from django.db import migrations
from django.utils import timezone


def backfill_publication(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    Service.objects.filter(is_published=False).update(is_published=True, published_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0003_alter_service_is_published"),
    ]

    operations = [
        migrations.RunPython(backfill_publication, migrations.RunPython.noop),
    ]
