mkdir tensorflow-temp
cd tensorflow-temp
git clone -n --depth=1 --filter=tree:0 https://github.com/tensorflow/tensorflow
cd tensorflow
git sparse-checkout set --no-cone tensorflow/lite tensorflow/compiler
git checkout
rm -rf .git
cd ../..
mv ./tensorflow-temp/tensorflow/ ./app
rm -r tensorflow-temp
