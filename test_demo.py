#!/usr/bin/env python3
"""
Quick test script for ProcessIQ RPA demo

This script verifies that the demo can run without issues
and showcases the key capabilities.
"""

import asyncio
import sys
from pathlib import Path
import tempfile

# Add the backend to Python path
backend_path = Path(__file__).parent / "apps" / "backend" / "src"
sys.path.insert(0, str(backend_path))

async def test_demo():
    """Test the ProcessIQ demo"""
    print("🧪 Testing ProcessIQ RPA Demo")
    print("=" * 50)
    
    try:
        # Import the demo
        from processiq.examples.kaggle_to_excel_demo import run_kaggle_excel_demo
        
        # Set up test directory
        test_dir = Path(tempfile.mkdtemp()) / "processiq_test"
        test_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"📁 Test output directory: {test_dir}")
        print("🚀 Running demo...")
        
        # Run the demo
        results = await run_kaggle_excel_demo(test_dir)
        
        # Check results
        if results["success"]:
            print("\n✅ Demo completed successfully!")
            print(f"📊 Steps completed: {len(results['steps'])}")
            
            total_time = sum(step.get("duration_ms", 0) for step in results["steps"])
            print(f"⏱️  Total time: {total_time/1000:.2f} seconds")
            
            # List artifacts
            if "artifacts" in results:
                print("\n📦 Generated artifacts:")
                for artifact_type, artifact_path in results["artifacts"].items():
                    if isinstance(artifact_path, list):
                        print(f"   📁 {artifact_type}: {len(artifact_path)} files")
                    else:
                        print(f"   📄 {artifact_type}: {Path(str(artifact_path)).name}")
            
            print(f"\n🎉 All files saved to: {test_dir}")
            return True
            
        else:
            print(f"\n❌ Demo failed: {results.get('error', 'Unknown error')}")
            return False
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure all dependencies are installed:")
        print("   pip install playwright pandas openpyxl")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_demo())
    sys.exit(0 if success else 1)